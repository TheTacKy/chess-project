import { Link } from 'react-router-dom';

function ChessLogo() {
  return (
    <Link 
      to="/" 
      className="inline-block"
    >
      <h1 className="text-2xl font-bold text-black dark:text-white leading-tight hover:opacity-80 transition-opacity">
        Chess Game
      </h1>
    </Link>
  );
}

export default ChessLogo;

