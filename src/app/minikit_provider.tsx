'use client' // Required for Next.js

import { ReactNode, useEffect } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'

export default function MiniKitProvider({ children }: { children: ReactNode }) {
	useEffect(() => {
		// Get the app ID from environment variables
		const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID || null
		
		// Install MiniKit with app ID
		MiniKit.install(appId)
		
		// Check if MiniKit is properly installed
		if (MiniKit.isInstalled()) {
			console.log("MiniKit installed successfully - Running in World App")
		} else {
			console.log("MiniKit not installed - Running in browser")
		}
	}, [])

	return children
}