import { useEffect, useRef } from 'react'
import './App.css'
import { createEarth } from './utils/earth'

function App() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const renderEarth = () => {
    wrapperRef.current && createEarth(wrapperRef.current)
  }

  useEffect(() => {
    renderEarth()
  }, [])

  return <div className="wrapper" ref={wrapperRef}></div>
}

export default App
