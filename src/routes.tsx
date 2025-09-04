import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter } from 'react-router-dom'
import App from './App'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
  },
]

export const router = createBrowserRouter(routes)

export default routes
