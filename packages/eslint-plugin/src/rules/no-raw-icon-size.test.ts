import { RuleTester } from "@typescript-eslint/rule-tester";
import * as typescriptEslintParser from "@typescript-eslint/parser";
import rule from "./no-raw-icon-size.js";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: typescriptEslintParser,
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

ruleTester.run("no-raw-icon-size", rule, {
  valid: [
    // Icon size scale token is allowed.
    `import { Info } from "lucide-react";
     const x = <Info className="icon-base" />;`,
    `import { Info } from "lucide-react";
     const x = <Info className="icon-sm" />;`,
    `import { Info } from "lucide-react";
     const x = <Info className="icon-lg" />;`,
    `import { Info } from "lucide-react";
     const x = <Info className="icon-xl" />;`,
    // Non-numeric dimension utilities are not icon sizes.
    `import { Info } from "lucide-react";
     const x = <Info className="size-full h-auto" />;`,
    // Non-lucide element with the same raw classes is not reported.
    `import { Info } from "lucide-react";
     const x = <div className="h-4 w-4" />;`,
    // className expression that is neither a literal, template literal, nor
    // a cn(...) call is left alone.
    `import { Info } from "lucide-react";
     const x = <Info className={someVar} />;`,
    // Empty expression container does not crash the rule.
    `import { Info } from "lucide-react";
     const x = <Info size={} />;`,
    `import { Info } from "lucide-react";
     const x = <Info className={} />;`,
    // A boolean className attribute (no value) is not a forbidden size.
    `import { Info } from "lucide-react";
     const x = <Info className />;`,
    // Files listed in `exceptions` are skipped entirely.
    {
      code: `import { Info } from "lucide-react";
             const x = <Info className="h-4 w-4" strokeWidth={1.5} />;`,
      filename: "src/components/legacy/Foo.tsx",
      options: [{ exceptions: ["components/legacy/"] }],
    },
    // Non-numeric size string and non-string/number size literal are not
    // on the banned list.
    `import { Info } from "lucide-react";
     const x = <Info size="1em" />;`,
    `import { Info } from "lucide-react";
     const x = <Info size={true} />;`,
    // Non-literal size expression is not a forbidden size.
    `import { Info } from "lucide-react";
     const x = <Info size={someVar} />;`,
    // An import of the same name from a different module is not a
    // lucide-react icon.
    `import { Info } from "other-icons";
     const x = <Info className="h-4 w-4" />;`,
    // A namespace import produces a JSXMemberExpression tag name, which is
    // never tracked as a lucide-react local name.
    `import * as Icons from "lucide-react";
     const x = <Icons.Info className="h-4 w-4" />;`,
    // A boolean attribute (no value) is not a forbidden size.
    `import { Info } from "lucide-react";
     const x = <Info size />;`,
    // A JSXElement attribute value is neither a literal nor an expression
    // container.
    `import { Info } from "lucide-react";
     const x = <Info className=<span /> />;`,
    `import { Info } from "lucide-react";
     const x = <Info size=<span /> />;`,
  ],
  invalid: [
    {
      code: `import { Info } from "lucide-react";
             const x = <Info className="h-4 w-4" />;`,
      errors: [{ messageId: "unexpected" }],
    },
    {
      code: `import { Info } from "lucide-react";
             const x = <Info className="size-3.5" />;`,
      errors: [{ messageId: "unexpected" }],
    },
    {
      code: `import { Info } from "lucide-react";
             const x = <Info size={16} />;`,
      errors: [{ messageId: "unexpected" }],
    },
    // Every raw size is off the scale, not only 12/14/16.
    {
      code: `import { Info } from "lucide-react";
             const x = <Info className="h-5 w-5" />;`,
      errors: [{ messageId: "unexpected" }],
    },
    {
      code: `import { Info } from "lucide-react";
             const x = <Info size={20} />;`,
      errors: [{ messageId: "unexpected" }],
    },
    {
      code: `import { Info } from "lucide-react";
             const x = <Info className="md:size-6" />;`,
      errors: [{ messageId: "unexpected" }],
    },
    // Retired scale names.
    {
      code: `import { Info } from "lucide-react";
             const x = <Info className="icon-md" />;`,
      errors: [{ messageId: "unexpected" }],
    },
    // Raw size on one branch of a conditional or a logical expression.
    {
      code: `import { Info } from "lucide-react";
             const x = <Info className={open ? "icon-base" : "size-3"} />;`,
      errors: [{ messageId: "unexpected" }],
    },
    {
      code: `import { Info } from "lucide-react";
             const x = <Info className={cn("shrink-0", open && "h-4 w-4")} />;`,
      errors: [{ messageId: "unexpected" }],
    },
    // Custom stroke width.
    {
      code: `import { Info } from "lucide-react";
             const x = <Info className="icon-base" strokeWidth={1.5} />;`,
      errors: [{ messageId: "strokeWidth" }],
    },
    {
      code: `import { Info } from "lucide-react";
             const x = <Info strokeWidth={2} />;`,
      errors: [{ messageId: "strokeWidth" }],
    },
    // Aliased import.
    {
      code: `import { Info as InfoIcon } from "lucide-react";
             const x = <InfoIcon className="w-3" />;`,
      errors: [{ messageId: "unexpected" }],
    },
    // Raw size inside a cn(...) call.
    {
      code: `import { Info } from "lucide-react";
             const x = <Info className={cn("flex", "h-4 w-4")} />;`,
      errors: [{ messageId: "unexpected" }],
    },
    // String-valued size prop without braces.
    {
      code: `import { Info } from "lucide-react";
             const x = <Info size="16" />;`,
      errors: [{ messageId: "unexpected" }],
    },
    // Raw size inside a template literal.
    {
      code:
        'import { Info } from "lucide-react";\n' +
        "             const x = <Info className={`flex ${y} h-4`} />;",
      errors: [{ messageId: "unexpected" }],
    },
    // Spread and namespaced attributes are skipped; the className attribute
    // after them is still checked.
    {
      code: `import { Info } from "lucide-react";
             const x = <Info {...rest} xml:lang="en" className="h-4 w-4" />;`,
      errors: [{ messageId: "unexpected" }],
    },
  ],
});
