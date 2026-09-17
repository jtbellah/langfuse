import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

import { createRule } from "../util.js";
import { extractTailwindUtilityTokens } from "../rule-helpers/tailwind.js";

// lucide-react icons size only through the icon scale (icon-sm 12px,
// icon-base 14px, icon-lg 20px, icon-xl 28px). Raw Tailwind height/width/size utilities and
// numeric `size` props escape it. Stroke width is the lucide default
// everywhere, so `strokeWidth` is banned as well.
const RAW_ICON_SIZE_CLASS = /^(?:h|w|size)-(?:\d+(?:\.\d+)?|px|\[.*\])$/;
const RETIRED_ICON_SIZE_CLASSES = new Set(["icon-md"]);

type Options = [{ exceptions?: string[] }];
type MessageIds = "unexpected" | "strokeWidth";

function classNameValueHasForbiddenSize(value: string): boolean {
  for (const utility of extractTailwindUtilityTokens(value)) {
    if (RAW_ICON_SIZE_CLASS.test(utility)) return true;
    if (RETIRED_ICON_SIZE_CLASSES.has(utility)) return true;
  }
  return false;
}

function classNameExpressionHasForbiddenSize(
  node: TSESTree.Expression,
): boolean {
  if (node.type === AST_NODE_TYPES.Literal) {
    return (
      typeof node.value === "string" &&
      classNameValueHasForbiddenSize(node.value)
    );
  }

  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.quasis.some((quasi) =>
      classNameValueHasForbiddenSize(quasi.value.raw),
    );
  }

  if (node.type === AST_NODE_TYPES.ConditionalExpression) {
    return (
      classNameExpressionHasForbiddenSize(node.consequent) ||
      classNameExpressionHasForbiddenSize(node.alternate)
    );
  }

  if (node.type === AST_NODE_TYPES.LogicalExpression) {
    return classNameExpressionHasForbiddenSize(node.right);
  }

  if (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === "cn"
  ) {
    return node.arguments.some(
      (argument) =>
        argument.type !== AST_NODE_TYPES.SpreadElement &&
        classNameExpressionHasForbiddenSize(argument),
    );
  }

  return false;
}

function hasForbiddenClassName(attribute: TSESTree.JSXAttribute): boolean {
  const value = attribute.value;
  if (!value) return false;

  if (value.type === AST_NODE_TYPES.Literal) {
    return (
      typeof value.value === "string" &&
      classNameValueHasForbiddenSize(value.value)
    );
  }

  if (value.type !== AST_NODE_TYPES.JSXExpressionContainer) return false;
  const expression = value.expression;
  if (expression.type === AST_NODE_TYPES.JSXEmptyExpression) return false;

  return classNameExpressionHasForbiddenSize(expression);
}

function getNumericLiteralValue(node: TSESTree.Expression): number | null {
  if (node.type !== AST_NODE_TYPES.Literal) return null;
  if (typeof node.value === "number") return node.value;
  if (typeof node.value === "string") {
    const parsed = Number(node.value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function hasForbiddenSizeProp(attribute: TSESTree.JSXAttribute): boolean {
  const value = attribute.value;
  if (!value) return false;

  let expression: TSESTree.Expression | null = null;
  if (value.type === AST_NODE_TYPES.Literal) {
    expression = value;
  } else if (value.type === AST_NODE_TYPES.JSXExpressionContainer) {
    if (value.expression.type === AST_NODE_TYPES.JSXEmptyExpression) {
      return false;
    }
    expression = value.expression;
  }
  if (!expression) return false;

  return getNumericLiteralValue(expression) !== null;
}

const rule = createRule<Options, MessageIds>({
  name: "no-raw-icon-size",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw Tailwind size utilities, numeric `size` props and `strokeWidth` on lucide-react icons; sizes come from the icon scale (icon-sm/icon-base/icon-lg/icon-xl).",
    },
    schema: [
      {
        type: "object",
        properties: {
          exceptions: {
            type: "array",
            items: { type: "string" },
            description:
              "File path substrings whose lucide icons may keep raw sizes.",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unexpected:
        "Use the icon size scale: icon-sm (12px), icon-base (14px), icon-lg (20px) or icon-xl (28px) instead of raw sizes.",
      strokeWidth:
        "Do not set strokeWidth on lucide icons; every icon uses the lucide default.",
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const filename = context.filename.replace(/\\/g, "/");
    if (options.exceptions?.some((exception) => filename.includes(exception))) {
      return {};
    }

    const lucideLocalNames = new Set<string>();

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "lucide-react") return;

        for (const specifier of node.specifiers) {
          if (specifier.type !== AST_NODE_TYPES.ImportSpecifier) continue;
          lucideLocalNames.add(specifier.local.name);
        }
      },
      JSXOpeningElement(node) {
        const name = node.name;
        if (name.type !== AST_NODE_TYPES.JSXIdentifier) return;
        if (!lucideLocalNames.has(name.name)) return;

        for (const attribute of node.attributes) {
          if (attribute.type !== AST_NODE_TYPES.JSXAttribute) continue;
          if (attribute.name.type !== AST_NODE_TYPES.JSXIdentifier) continue;

          if (
            attribute.name.name === "className" &&
            hasForbiddenClassName(attribute)
          ) {
            context.report({ node: attribute, messageId: "unexpected" });
            continue;
          }

          if (
            attribute.name.name === "size" &&
            hasForbiddenSizeProp(attribute)
          ) {
            context.report({ node: attribute, messageId: "unexpected" });
            continue;
          }

          if (attribute.name.name === "strokeWidth") {
            context.report({ node: attribute, messageId: "strokeWidth" });
          }
        }
      },
    };
  },
});

export default rule;
