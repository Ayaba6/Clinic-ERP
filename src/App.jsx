import { AuthProvider } from './context/AuthContext'
import { CliniqueProvider } from './context/CliniqueProvider'
import { AppRoutes } from './routes/AppRoutes'

function App() {
  return (
    <CliniqueProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </CliniqueProvider>
  )
}

export default App