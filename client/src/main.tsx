import ReactDOM from 'react-dom/client';
import App from './react/App';

import './styles/global.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
	throw new Error("Fatal Error: Root element with ID 'root' not found in index.html");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
	<>
		<App />
	</>,
);

console.log('[ProjectOverride Client] Application mounted.');
