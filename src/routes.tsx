import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter } from 'react-router-dom'
import ClassManagement from './pages/ClassManagement'
import ClassProducts from './pages/ClassProducts'
import ClassShopPage from './pages/ClassShopPage'
import ClassStudents from './pages/ClassStudents'

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
  {
    path: '/class/:classId/shop',
    element: <ClassShopPage />,
  },
]

export const router = createBrowserRouter(routes)

export default routes
