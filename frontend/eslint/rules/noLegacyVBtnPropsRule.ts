import type { Rule } from "eslint"
import type { AST } from "vue-eslint-parser"

const legacyVBtnPropReplacements = {
  text: 'Use `variant="text"` on `v-btn`.',
  plain: 'Use `variant="plain"` on `v-btn`.',
  outlined: 'Use `variant="outlined"` on `v-btn`.',
  small: 'Use `size="small"` on `v-btn`.',
  "x-small": 'Use `size="x-small"` on `v-btn`.',
  dark: 'Use explicit text or background color classes on `v-btn` instead of `dark`.',
  fab: 'Use explicit `icon`, `size`, and layout classes on `v-btn` instead of `fab`.',
  depressed:
    'Use an explicit `variant`, such as `variant="flat"`, on `v-btn` instead of `depressed`.',
} as const

type LegacyVBtnProp = keyof typeof legacyVBtnPropReplacements

interface TemplateVisitor {
  VAttribute(node: AST.VAttribute | AST.VDirective): void
}

interface VueTemplateParserServices {
  defineTemplateBodyVisitor(
    templateBodyVisitor: TemplateVisitor
  ): Rule.RuleListener
}

const hasDefineTemplateBodyVisitor = (
  value: unknown
): value is VueTemplateParserServices => {
  if (typeof value !== "object" || value === null) {
    return false
  }

  return (
    "defineTemplateBodyVisitor" in value &&
    typeof value.defineTemplateBodyVisitor === "function"
  )
}

const isLegacyVBtnProp = (name: string): name is LegacyVBtnProp =>
  name in legacyVBtnPropReplacements

export const noLegacyVBtnPropsRule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Reject legacy Vuetify 2 v-btn props in Vue templates",
    },
    schema: [],
    messages: {
      legacyProp:
        "Legacy `v-btn` prop `{{ prop }}` is not allowed. {{ replacement }}",
    },
  },
  create(context) {
    const parserServices: unknown = context.sourceCode.parserServices
    if (!hasDefineTemplateBodyVisitor(parserServices)) {
      return {}
    }

    return parserServices.defineTemplateBodyVisitor({
      VAttribute(node) {
        if (node.directive) {
          return
        }

        const tag = node.parent.parent
        if (tag.rawName !== "v-btn") {
          return
        }

        const prop = node.key.name
        if (!isLegacyVBtnProp(prop)) {
          return
        }

        context.report({
          node,
          messageId: "legacyProp",
          data: {
            prop,
            replacement: legacyVBtnPropReplacements[prop],
          },
        })
      },
    })
  },
}
