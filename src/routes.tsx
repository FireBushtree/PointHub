import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter } from 'react-router-dom'
import Home from './Home'
import ClassStudents from './pages/ClassStudents'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/class/:classId',
    element: <ClassStudents />,
  },
]

export const router = createBrowserRouter(routes)

export default routes
