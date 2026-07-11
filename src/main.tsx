import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { StoreProvider, useStore } from './lib/store'
import Layout from './components/Layout'
import Welcome from './pages/Welcome'
import Feed, { PostDetail } from './pages/Feed'
import Nearby from './pages/Nearby'
import TaskDetail from './pages/TaskDetail'
import Publish from './pages/Publish'
import MyTasks from './pages/MyTasks'
import Messages from './pages/Messages'
import Points from './pages/Points'
import Profile from './pages/Profile'
import Trust from './pages/Trust'
import Circles, { CircleDetail } from './pages/Circles'
import Safety from './pages/Safety'
import Admin from './pages/Admin'

function Guard({ children }: { children: React.ReactNode }) {
  const { state } = useStore()
  if (!state.currentUserId) return <Navigate to="/welcome" replace />
  if (!state.onboarded) return <Navigate to="/welcome" replace />
  return <>{children}</>
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route element={<Guard><Layout /></Guard>}>
          <Route path="/" element={<Feed />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/nearby" element={<Nearby />} />
          <Route path="/task/:id" element={<TaskDetail />} />
          <Route path="/publish" element={<Publish />} />
          <Route path="/mytasks" element={<MyTasks />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:id" element={<Messages />} />
          <Route path="/points" element={<Points />} />
          <Route path="/user/:id" element={<Profile />} />
          <Route path="/trust" element={<Trust />} />
          <Route path="/circles" element={<Circles />} />
          <Route path="/circle/:id" element={<CircleDetail />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/:section" element={<Admin />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
