/** Public hiring metadata shared by the API and careers renderer. */
export type HiringDepartment = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  icon_key: string | null;
  reference_roles: { title: string; task: string; duration: string }[];
};
export const PUBLIC_DEPARTMENT_COLUMNS = "id,name,slug,sort_order,icon_key,reference_roles";
