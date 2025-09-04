import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter } from 'react-router-dom'
import Home from './Home'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Home />,
  },
]

export const router = createBrowserRouter(routes)

export default routes
