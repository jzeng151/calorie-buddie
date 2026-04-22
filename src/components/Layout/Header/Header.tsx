import { ThemeToggle } from "../../Features/ThemeToggle"

export function Header() {
   const navItems = [
     { label: "Menu", href: "#menu"},
     { label: "Plan", href: "/plan" },
     { label: "Recipes", href: "/recipes" },
     { label: "History", href: "/history" },
     { label: "Suggest", href: "/suggest" },
     { label: "Friends", href: "#friends" },
   ];
  const title = "Calorie Buddie";

  return (
    <nav className="bg-(--color-header-bg) text-(--color-text-dark) shadow-md shadow-(--color-shadow)">
      <div className="flex justify-between items-center py-4">
        {/* Title */}
        <div className="flex items-center ml-5">
          <a
            href="#home"
            className="text-2xl font-bold"
          >
            { title }
          </a>
        </div>

        {/* Navbar */}
        <div className="hidden md:flex items-center space-x-8">
          {navItems.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className={`px-3 py-2 rounded-md text-sm font-medium hover:text-[#ffffff] hover:bg-[#6b5444] transition-colors duration-200`}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Login button */}
        <div className="hidden md:block">
          <ThemeToggle />
        </div>

        {/* Login button */}
        <div className="hidden md:block">
          <button className="bg-[#75594a] hover:bg-(--color-text-dark) text-[#f5e6d3] px-6 py-2 rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg mr-5">
            Log in
          </button>
        </div>
      </div>
    </nav>
  );
}