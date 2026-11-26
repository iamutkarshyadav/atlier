import type { PromotionRule } from '../types/database.types'

export interface RuleEvaluationTarget {
  productId: string
  variantId?: string
  categoryId?: string | null
  category?: string | null
  subcategoryId?: string | null
  collectionIds?: string[]
  isTryOnEligible?: boolean
  sku?: string | null
}

/**
 * Checks whether an individual normalized rule matches the evaluation target.
 */
export function doesRuleMatchTarget(rule: any, target: RuleEvaluationTarget): boolean {
  const targetType = String(rule.target_type ?? rule.targetType ?? '')
  const targetId = rule.target_id ?? rule.targetId ?? null
  const targetValues: string[] = Array.isArray(rule.target_values ?? rule.targetValues)
    ? (rule.target_values ?? rule.targetValues)
    : []

  if (targetType === 'entire_order') {
    return true
  }

  if (targetType === 'product') {
    if (targetId && target.productId === targetId) return true
    if (targetValues.length > 0 && targetValues.includes(target.productId)) return true
    return false
  }

  if (targetType === 'variant') {
    if (!target.variantId) return false
    if (targetId && target.variantId === targetId) return true
    if (targetValues.length > 0 && targetValues.includes(target.variantId)) return true
    return false
  }

  if (targetType === 'category') {
    const targetCatId = target.categoryId ? String(target.categoryId) : null
    const targetCatName = target.category ? String(target.category).toLowerCase().trim() : null

    if (targetId) {
      const matchId = String(targetId)
      if (targetCatId && targetCatId === matchId) return true
      if (targetCatName && matchId.toLowerCase().trim() === targetCatName) return true
    }

    if (targetValues.length > 0) {
      if (targetCatId && targetValues.some((v) => String(v) === targetCatId)) return true
      if (targetCatName && targetValues.some((v) => String(v).toLowerCase().trim() === targetCatName)) return true
    }

    return false
  }

  if (targetType === 'subcategory') {
    const targetSubId = target.subcategoryId ? String(target.subcategoryId) : null
    if (!targetSubId) return false

    if (targetId && String(targetId) === targetSubId) return true
    if (targetValues.length > 0 && targetValues.some((v) => String(v) === targetSubId)) return true
    return false
  }

  if (targetType === 'collection') {
    if (!target.collectionIds || target.collectionIds.length === 0) return false
    if (targetId && target.collectionIds.includes(String(targetId))) return true
    if (targetValues.length > 0 && target.collectionIds.some((c) => targetValues.includes(String(c)))) return true
    return false
  }

  if (targetType === 'try_on_eligible') {
    const expected = targetId === 'false' || targetId === false ? false : true
    const actual = Boolean(target.isTryOnEligible ?? true)
    return actual === expected
  }

  if (targetType === 'specific_sku') {
    if (!target.sku) return false
    const itemSku = String(target.sku).toLowerCase().trim()
    if (targetId && String(targetId).toLowerCase().trim() === itemSku) return true
    if (targetValues.length > 0 && targetValues.some((s) => String(s).toLowerCase().trim() === itemSku)) return true
    return false
  }

  return false
}

/**
 * Evaluates a set of promotion rules against a product or cart item using standard enterprise e-commerce boolean logic:
 * 1. Exclude rules take precedence: if ANY exclude rule matches, the target is disqualified immediately.
 * 2. If no include rules exist (or only 'entire_order'), the target matches storewide.
 * 3. Include rules are grouped by target_type:
 *    - AND across different rule types (e.g. Category 'Hoodies' AND Try-on eligible 'true')
 *    - OR within the same rule type (e.g. Category 'Hoodies' OR Category 'Sweatshirts')
 *    - Target must satisfy EVERY active include group to be eligible.
 */
export function evaluatePromotionRules(
  rawRules: PromotionRule[] | any[] | undefined | null,
  target: RuleEvaluationTarget
): boolean {
  if (!rawRules || rawRules.length === 0) return true

  const rules = rawRules.map((r: any) => ({
    target_type: r.target_type ?? r.targetType,
    target_id: r.target_id ?? r.targetId,
    target_values: r.target_values ?? r.targetValues ?? [],
    match_operator: r.match_operator ?? r.matchOperator ?? 'include',
    rule_group_id: r.rule_group_id ?? r.ruleGroupId,
  }))

  // 1. Exclude rules take absolute precedence: if any exclude rule matches, target is disqualified
  const excludeRules = rules.filter((r) => r.match_operator === 'exclude')
  for (const exRule of excludeRules) {
    if (doesRuleMatchTarget(exRule, target)) {
      return false
    }
  }

  // 2. Separate include rules
  const includeRules = rules.filter((r) => r.match_operator !== 'exclude')
  if (includeRules.length === 0) return true

  // If there are only 'entire_order' includes, it's storewide
  const nonEntireOrderIncludes = includeRules.filter((r) => r.target_type !== 'entire_order')
  if (nonEntireOrderIncludes.length === 0) return true

  // 3. Group include rules by target_type
  // AND across distinct target_types, OR within the same target_type
  const rulesByType = new Map<string, typeof nonEntireOrderIncludes>()
  for (const rule of nonEntireOrderIncludes) {
    const typeKey = String(rule.target_type)
    const list = rulesByType.get(typeKey) || []
    list.push(rule)
    rulesByType.set(typeKey, list)
  }

  const typeGroups = Array.from(rulesByType.values())
  for (let i = 0; i < typeGroups.length; i++) {
    const typeRules = typeGroups[i]
    const matchesAny = typeRules.some((r: any) => doesRuleMatchTarget(r, target))
    if (!matchesAny) {
      return false
    }
  }

  return true
}
