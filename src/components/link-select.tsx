import type { LinkGroups } from "@/lib/tasks";
import { inputClass } from "@/components/ui";

// <select> of projects and learning paths ("project:<id>" / "path:<id>").
export function LinkSelect({ links, defaultValue }: { links: LinkGroups; defaultValue?: string }) {
  return (
    <select name="link" defaultValue={defaultValue} className={inputClass}>
      <option value="">— None —</option>
      {links.projects.length > 0 && (
        <optgroup label="Projects">
          {links.projects.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      )}
      {links.paths.length > 0 && (
        <optgroup label="Learning paths">
          {links.paths.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
