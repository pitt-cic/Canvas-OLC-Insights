import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import CourseListScreen from './screens/CourseListScreen'
import CourseOptionsScreen from './screens/CourseOptionsScreen'
import ProcessingScreen from './screens/ProcessingScreen'
import DashboardScreen from './screens/DashboardScreen'
import WorkspaceScreen from './screens/WorkspaceScreen'
import MetricsDashboardScreen from './screens/MetricsDashboardScreen'
import ReviewDataLoader from './components/ReviewDataLoader'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/courses" replace /> },
      { path: 'courses', element: <CourseListScreen /> },
      { path: 'course/:courseId', element: <CourseOptionsScreen /> },
      { path: 'course/:courseId/processing/:reviewId', element: <ProcessingScreen /> },
      {
        path: 'course/:courseId/review/:reviewId',
        element: <ReviewDataLoader />,
        children: [
          { index: true, element: <DashboardScreen /> },
          { path: 'workspace', element: <WorkspaceScreen /> },
        ],
      },
      { path: 'course/:courseId/metrics', element: <MetricsDashboardScreen /> },
      { path: '*', element: <Navigate to="/courses" replace /> },
    ],
  },
])
