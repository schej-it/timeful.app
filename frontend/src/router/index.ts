import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router"
import Landing from "@/views/Landing.vue"
import { get } from "@/utils"
import {
  getEventRouteProps,
  getGroupRouteProps,
  getHomeRouteProps,
  getSignUpRouteProps,
} from "./routeProps"

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "landing",
    component: Landing,
  },
  {
    path: "/home",
    name: "home",
    component: () => import("@/views/Home.vue"),
    props: getHomeRouteProps,
  },
  {
    path: "/settings",
    name: "settings",
    component: () => import("@/views/Settings.vue"),
  },
  {
    path: "/e/:eventId",
    name: "event",
    component: () => import("@/views/Event.vue"),
    props: getEventRouteProps,
  },
  {
    path: "/e/:eventId/responded",
    name: "responded",
    component: () => import("@/views/Responded.vue"),
    props: true,
  },
  {
    path: "/g/:groupId",
    name: "group",
    component: () => import("@/views/Group.vue"),
    props: getGroupRouteProps,
  },
  {
    path: "/s/:signUpId",
    name: "signUp",
    component: () => import("@/views/SignUp.vue"),
    props: getSignUpRouteProps,
  },
  {
    path: "/sign-in",
    name: "sign-in",
    component: () => import("@/views/SignIn.vue"),
  },
  {
    path: "/sign-up",
    name: "sign-up",
    component: () => import("@/views/SignIn.vue"),
    props: { initialIsSignUp: true },
  },
  {
    path: "/auth",
    name: "auth",
    component: () => import("@/views/Auth.vue"),
  },
  {
    path: "/privacy-policy",
    name: "privacy-policy",
    component: () => import("@/views/PrivacyPolicy.vue"),
  },
  {
    path: "/cookie-settings",
    name: "cookie-settings",
    component: () => import("@/components/CookieSettings.vue"),
  },
  {
    path: "/stripe-redirect",
    name: "stripe-redirect",
    component: () => import("@/views/StripeRedirect.vue"),
  },
  {
    path: "/test",
    name: "test",
    component: () => import("@/views/Test.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    name: "404",
    component: () => import("@/views/PageNotFound.vue"),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  if (to.name !== "event" && to.name !== "group") {
    const fusetag = window.fusetag ?? (window.fusetag = { que: [] })
    fusetag.que.push(function () {
      fusetag.destroySticky?.()
    })
  }

  const authRoutes = ["home", "settings"]
  const noAuthRoutes = ["sign-in", "sign-up"]
  const name = typeof to.name === "string" ? to.name : ""

  try {
    await get("/auth/status")
    if (noAuthRoutes.includes(name)) {
      return { name: "home" }
    }
    return true
  } catch {
    if (authRoutes.includes(name)) {
      return { name: "landing" }
    }
    return true
  }
})

export default router
