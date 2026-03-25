import {
  Outlet,
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import Inventory from "./pages/Inventory";
import Leaderboard from "./pages/Leaderboard";
import Manual from "./pages/Manual";
import Play from "./pages/Play";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Play,
});

const playRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/play",
  component: Play,
});

const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/inventory",
  component: Inventory,
});

const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/leaderboard",
  component: Leaderboard,
});

const manualRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/manual",
  component: Manual,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  playRoute,
  inventoryRoute,
  leaderboardRoute,
  manualRoute,
]);

const hashHistory = createHashHistory();
const router = createRouter({ routeTree, history: hashHistory });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
