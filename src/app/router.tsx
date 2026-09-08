import { createBrowserRouter } from "react-router-dom";
import Catalog from "./Catalog";
import DrillPage from "./DrillPage";
import ExplorablePage from "./ExplorablePage";
import { NotFound } from "./NotFound";

export const router = createBrowserRouter([
  { path: "/", element: <Catalog /> },
  { path: "/d/:id", element: <DrillPage /> },
  { path: "/x/:id", element: <ExplorablePage /> },
  { path: "*", element: <NotFound /> },
]);
