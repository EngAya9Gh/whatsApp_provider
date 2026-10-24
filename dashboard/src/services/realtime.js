import { io } from 'socket.io-client'
import axios from 'axios'

/**
 * Authenticated socket connection. The server reads the login token and decides which
 * rooms (account, restricted agent, personal) the connection joins.
 */
export function connectSocket() {
  const base = axios.defaults.baseURL || window.location.origin
  return io(base, {
    path: '/socket.io',
    auth: (cb) => cb({ token: localStorage.getItem('token') })
  })
}
