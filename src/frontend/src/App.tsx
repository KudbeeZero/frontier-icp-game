import {
  Outlet,
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import Inventory from "./pages/Inventory";
import Leaderboard from "./pages/Leaderboard";
import Play from "./pages/Play";
import { useGameStore } from "./store/gameStore";

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

const routeTree = rootRoute.addChildren([
  indexRoute,
  playRoute,
  inventoryRoute,
  leaderboardRoute,
]);

const hashHistory = createHashHistory();
const router = createRouter({ routeTree, history: hashHistory });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function GameTicker() {
  useEffect(() => {
    const id = setInterval(() => {
      const store = useGameStore.getState();
      store.tickPassiveIncome();
      store.tickMineralDrip();
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return null;
}

export default function App() {
  return (
    <>
      <GameTicker />
      <RouterProvider router={router} />
    </>
  );
}
