import Link from "next/link";
import { ThemeToggle } from "../../Features/ThemeToggle";
import { createClient } from "@/lib/supabase/server";

const navItems = [
  { label: "Menu", href: "/menu" },
  { label: "Plan", href: "/plan" },
  { label: "Recipes", href: "/recipes" },
  { label: "History", href: "/history" },
  { label: "Suggest", href: "/suggest" },
  { label: "Friends", href: "/friends" },
];

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let avatar: string | null = null;
  let displayName: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    avatar = profile?.avatar_url ?? null;
    displayName = profile?.username ?? user.email?.split("@")[0] ?? null;
  }

  return (
    <nav className="bg-(--color-header-bg) text-(--color-text-dark) shadow-md shadow-(--color-shadow)">
      <div className="flex justify-between items-center py-4">
        {/* Title */}
        <div className="flex items-center ml-5">
          <Link href="/" className="text-2xl font-bold">
            Calorie Buddie
          </Link>
        </div>

        {/* Navbar */}
        <div className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 rounded-md text-sm font-medium hover:text-[#ffffff] hover:bg-[#6b5444] transition-colors duration-200"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3 mr-5">
          <ThemeToggle />
          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm hover:bg-[#6b5444] hover:text-white transition-colors duration-200"
            >
              {avatar && <span className="text-xl leading-none">{avatar}</span>}
              <span>{displayName}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="bg-[#75594a] hover:bg-(--color-text-dark) text-[#f5e6d3] px-6 py-2 rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
