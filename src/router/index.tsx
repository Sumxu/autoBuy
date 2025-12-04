// src/router/index.tsx
import { Routes, Route } from "react-router-dom";
import { routes } from "./routes";
export default function AppRouter() {
  return (
    <Routes>
      {routes.map((item) => (
        <Route key={item.path} path={item.path} element={item.element} />
      ))}
    </Routes>
  );
}
