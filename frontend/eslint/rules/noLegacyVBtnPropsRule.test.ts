import { ESLint } from "eslint"
import vueParser from "vue-eslint-parser"
import tseslint from "typescript-eslint"
import { describe, expect, it } from "vitest"
import { noLegacyVBtnPropsRule } from "./noLegacyVBtnPropsRule"

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.vue"],
      plugins: {
        local: {
          rules: {
            "no-legacy-v-btn-props": noLegacyVBtnPropsRule,
          },
        },
      },
      languageOptions: {
        parser: vueParser,
        parserOptions: {
          parser: tseslint.parser,
          extraFileExtensions: [".vue"],
        },
      },
      rules: {
        "local/no-legacy-v-btn-props": "error",
      },
    },
  ],
})

describe("no-legacy-v-btn-props lint rule", () => {
  it("rejects deprecated Vuetify 2 v-btn props", async () => {
    const [result] = await eslint.lintText(
      `<template>
        <v-btn text />
        <v-btn depressed />
      </template>`,
      { filePath: "LegacyButtons.vue" }
    )

    expect(result.errorCount).toBe(2)
    expect(result.messages.map((message) => message.ruleId)).toEqual([
      "local/no-legacy-v-btn-props",
      "local/no-legacy-v-btn-props",
    ])
    expect(result.messages.map((message) => message.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("text"),
        expect.stringContaining("depressed"),
      ])
    )
  })

  it("allows explicit Vuetify 3 button props", async () => {
    const [result] = await eslint.lintText(
      `<template>
        <v-btn variant="text" />
        <v-btn variant="flat" />
        <v-btn size="small" icon block color="primary" />
      </template>`,
      { filePath: "ModernButtons.vue" }
    )

    expect(result.errorCount).toBe(0)
  })
})
