"use client"

import { Menu, Bell, User, LogOut } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Mock user data - replace with actual auth in production
  const userName = "IT Admin"
  const userEmail = "admin@batten.virginia.edu"

  return (
    <header className="bg-uva-navy text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-uva-orange rounded-lg flex items-center justify-center font-serif font-bold text-xl">
                B
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold">
                  Batten IT Dashboard
                </h1>
                <p className="text-xs text-white/70">
                  UVA Resource Management
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Notifications and User */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button
              className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-uva-orange rounded-full"></span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-uva-orange rounded-full flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold">{userName}</p>
                  <p className="text-xs text-white/70">{userEmail}</p>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border-2 border-gray-100 py-2 text-gray-800">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold">{userName}</p>
                    <p className="text-xs text-gray-600">{userEmail}</p>
                  </div>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    onClick={() => {
                      // Add logout logic here
                      console.log('Logout clicked')
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
