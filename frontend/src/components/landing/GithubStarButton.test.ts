// @vitest-environment happy-dom

import { mount } from "@vue/test-utils"
import { nextTick } from "vue"
import { describe, expect, it, vi } from "vitest"
import { render } from "github-buttons"
import GithubStarButton from "./GithubStarButton.vue"

vi.mock("github-buttons", () => ({
  render: vi.fn((_anchor: HTMLAnchorElement, callback: (el: HTMLIFrameElement) => void) => {
    const iframe = document.createElement("iframe")
    iframe.style.width = "96px"
    iframe.style.height = "20px"
    callback(iframe)
  }),
}))

describe("GithubStarButton", () => {
  it("passes the legacy GitHub star anchor to the GitHub Buttons renderer", async () => {
    const wrapper = mount(GithubStarButton)

    const anchor = wrapper.get("a")
    expect(anchor.attributes("href")).toBe("https://github.com/schej-it/timeful.app")
    expect(anchor.attributes("data-show-count")).toBe("true")
    expect(anchor.attributes("aria-label")).toBe("Star timeful.app on GitHub")

    await nextTick()
    await nextTick()

    expect(render).toHaveBeenCalledWith(anchor.element, expect.any(Function))
    expect(wrapper.get("iframe").attributes("style")).toContain("width: 96px")
  })
})
