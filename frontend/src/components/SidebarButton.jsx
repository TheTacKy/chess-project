import { Link } from 'react-router-dom';

const SidebarButton = ({ to, icon, children, onClick, isActive = false, iconSize = 'w-6 h-6' }) => {
  const baseClasses = "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 hover:bg-gray-200 dark:hover:bg-zinc-800";
  const activeClasses = isActive ? "font-semibold" : "";
  const textClasses = "text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white";

  const content = (
    <>
      {icon && (
        typeof icon === 'string' && icon.startsWith('/') ? (
          <img src={icon} alt="" className={iconSize || "w-6 h-6"} />
        ) : (
          <span className="text-xl">{icon}</span>
        )
      )}
      <span className={textClasses}>{children}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${activeClasses} text-left`}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={to}
      className={`${baseClasses} ${activeClasses}`}
    >
      {content}
    </Link>
  );
};

export default SidebarButton;

