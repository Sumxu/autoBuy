import { lazy } from "react";
import { Navigate } from "react-router-dom";
const Home = lazy(() => import("@/pages/Home"));
export const routes = [
  { path: "/", element: <Navigate to="/home" replace /> },
  { path: "/home", element: <Home /> },
];
