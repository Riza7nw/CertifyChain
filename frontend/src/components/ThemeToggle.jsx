import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import IconButton from "./IconButton";

// Toggle tema light/dark (Phase 8).
export default function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const dark = resolved === "dark";
  return (
    <IconButton
      icon={dark ? Sun : Moon}
      label={dark ? "Mode terang" : "Mode gelap"}
      onClick={toggle}
    />
  );
}
