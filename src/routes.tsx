import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter } from 'react-router-dom'
import ClassManagement from './pages/ClassManagement'
import ClassStudents from './pages/ClassStudents'
import ClassProducts from './pages/ClassProducts'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <ClassManagement />,
  },
  {
    path: '/class/:classId/students',
    element: <ClassStudents />,
  },
  {
    path: '/class/:classId/products',
    element: <ClassProducts />,
  },
]

export const router = createBrowserRouter(routes)

export default routes
