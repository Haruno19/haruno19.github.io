import { Outlet } from "react-router-dom";

function Layout() {
  return (
    <div className="h-full w-full px-[20vw] py-[10vh] flex flex-col items-center">
      <Outlet />
    </div>
  )
}

export default Layout
