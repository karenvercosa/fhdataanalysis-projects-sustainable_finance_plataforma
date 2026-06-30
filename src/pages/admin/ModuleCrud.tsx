import { useParams } from "react-router-dom";
import { AdminCrud } from "./AdminCrud";
import { CRUD_CONFIGS } from "./crudConfigs";
import ModulePlaceholder from "./ModulePlaceholder";

/** Resolve /admin/:module → CRUD configurado ou placeholder (em construção). */
export default function ModuleCrud() {
  const { module = "" } = useParams();
  const config = CRUD_CONFIGS[module];
  return config ? <AdminCrud config={config} /> : <ModulePlaceholder />;
}
