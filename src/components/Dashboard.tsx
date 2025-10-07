import React, { useState, useEffect } from 'react'
import { PullRequest } from '../types'
import { GitHubService } from '../services/github'
import { PRCard } from './PRCard'
import { FilterBar } from './FilterBar'
import { StatsBar } from './StatsBar'

export const Dashboard: React.FC = () => {
  const [prs, setPRs] = useState<PullRequest[]>([])
  const [filteredPRs, setFilteredPRs] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [showClosedPRs, setShowClosedPRs] = useState(false)
  const [hideBots, setHideBots] = useState(true)
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isFromCache, setIsFromCache] = useState(false)
  const itemsPerPage = 25

  // Initialize filters from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const usersParam = urlParams.get('users')
    const projectsParam = urlParams.get('projects')
    const statusesParam = urlParams.get('statuses')

    if (usersParam) {
      setSelectedUsers(usersParam.split(',').filter(Boolean))
    }
    if (projectsParam) {
      setSelectedProjects(projectsParam.split(',').filter(Boolean))
    }
    if (statusesParam) {
      setSelectedStatuses(statusesParam.split(',').filter(Boolean))
    }
  }, [])

  // Update URL when filters change
  useEffect(() => {
    const url = new URL(window.location.href)
    const params = new URLSearchParams(url.search)

    if (selectedUsers.length > 0) {
      params.set('users', selectedUsers.join(','))
    } else {
      params.delete('users')
    }

    if (selectedProjects.length > 0) {
      params.set('projects', selectedProjects.join(','))
    } else {
      params.delete('projects')
    }

    if (selectedStatuses.length > 0) {
      params.set('statuses', selectedStatuses.join(','))
    } else {
      params.delete('statuses')
    }

    const newUrl = `${url.pathname}${params.toString() ? '?' + params.toString() : ''}`
    window.history.replaceState({}, '', newUrl)
  }, [selectedUsers, selectedProjects, selectedStatuses])

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)

      // Check cache first (already handled in useEffect on mount)
      // This only runs on force refresh

      const token = (import.meta as any).env.VITE_GITHUB_TOKEN
      if (!token) {
        setError('GITHUB_TOKEN environment variable is required. Please set VITE_GITHUB_TOKEN in your .env file')
        return
      }

      const github = new GitHubService(token)
      const allPRs = await github.fetchAllPullRequests('bravoure')

      // Cache the data (store only essential fields to reduce size)
      const timestamp = Date.now()
      const essentialPRs = allPRs.map(pr => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        draft: pr.draft,
        user: pr.user,
        assignees: pr.assignees,
        requested_reviewers: pr.requested_reviewers,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        html_url: pr.html_url,
        repository: pr.repository,
        review_decision: pr.review_decision
      }))

      // Check localStorage size and clean old data if needed
      const cacheData = JSON.stringify({ prs: essentialPRs })
      const maxCacheSize = 5 * 1024 * 1024 // 5MB limit

      if (cacheData.length > maxCacheSize) {
        console.warn('Cache data too large, clearing old cache...')
        localStorage.removeItem('github-prs-data')
        localStorage.removeItem('github-prs-timestamp')
      }

      localStorage.setItem('github-prs-data', cacheData)
      localStorage.setItem('github-prs-timestamp', timestamp.toString())

      setPRs(allPRs)
      // Don't set filteredPRs here - let the useEffect handle filtering
      setLastFetchTime(new Date(timestamp).toLocaleString())
      setIsFromCache(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch data if there's no cached data available
    const cachedData = localStorage.getItem('github-prs-data')
    const cachedTime = localStorage.getItem('github-prs-timestamp')

    if (!cachedData || !cachedTime) {
      console.log('No cached data found, fetching fresh data...')
      fetchData()
    } else {
      console.log('Cached data found, loading from cache...')
      try {
        const parsedData = JSON.parse(cachedData)
        setPRs(parsedData.prs)
        // Don't set filteredPRs here - let the useEffect handle filtering
        setLastFetchTime(new Date(parseInt(cachedTime)).toLocaleString())
        setIsFromCache(true)
        setLoading(false)
      } catch (parseError) {
        console.warn('Failed to parse cached data, fetching fresh data:', parseError)
        fetchData()
      }
    }
  }, [])


  useEffect(() => {
    let filtered = prs

    // Filter by open/closed status first
    if (!showClosedPRs) {
      filtered = filtered.filter(pr => pr.state === 'open')
    }


    if (selectedUsers.length > 0) {
      filtered = filtered.filter(pr => {
        // Filter by creator OR assignees
        const creatorLogin = pr.user?.login || ''
        const assigneeLogins = pr.assignees?.map(a => a.login || '') || []

        // Check if creator is in selected users
        const creatorSelected = selectedUsers.includes(creatorLogin)

        // Check if any assignee is in selected users
        const hasSelectedAssignee = assigneeLogins.some(login => selectedUsers.includes(login))

        return creatorSelected || hasSelectedAssignee
      })
    }

    if (selectedProjects.length > 0) {
      filtered = filtered.filter(pr => selectedProjects.includes(pr.repository?.name || ''))
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(pr => {
        const isDraft = pr.draft
        const isReady = !pr.draft && pr.review_decision !== 'APPROVED' && pr.review_decision !== 'CHANGES_REQUESTED'
        const isApproved = pr.review_decision === 'APPROVED'
        const isChanges = pr.review_decision === 'CHANGES_REQUESTED'

        return selectedStatuses.some(status => {
          if (status === 'draft') return isDraft
          if (status === 'ready') return isReady
          if (status === 'approved') return isApproved
          if (status === 'changes') return isChanges
          return false
        })
      })
    }

    console.log('🔍 Filtering PRs:', {
      totalPRs: prs.length,
      afterOpenClosedFilter: filtered.length,
      selectedUsers: selectedUsers.length,
      selectedProjects: selectedProjects.length,
      selectedStatuses: selectedStatuses.length,
      showClosedPRs,
      finalFiltered: filtered.length
    })

    // Debug: Log sample PR data to check review_decision values
    if (prs.length > 0) {
      const firstPR = prs[0]
      console.log('🔍 Sample PR data:', {
        firstPR: {
          title: firstPR?.title,
          draft: firstPR?.draft,
          review_decision: firstPR?.review_decision,
          state: firstPR?.state
        },
        selectedStatuses,
        statusCounts
      })
    }

    // Debug: Log some filtered PRs to see what's actually being filtered
    if (filtered.length > 0) {
      console.log('🔍 Filtered PRs sample:', filtered.slice(0, 3).map(pr => ({
        title: pr.title,
        draft: pr.draft,
        review_decision: pr.review_decision,
        state: pr.state
      })))
    }

    setFilteredPRs(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [prs, selectedUsers, selectedProjects, selectedStatuses, showClosedPRs, hideBots])

  // Get all possible users and projects from all PRs (for filter options)
  const allUsers = Array.from(new Set([
    ...prs.map(pr => pr.user?.login).filter(Boolean),
    ...prs.flatMap(pr => pr.assignees?.map(a => a.login) || [])
  ]))

  const allProjects = Array.from(new Set(prs.map(pr => pr.repository?.name).filter(Boolean)))

  // Track if we should apply bot filtering (only when checkbox is toggled)
  const [shouldApplyBotFilter, setShouldApplyBotFilter] = useState(false)

  // When hideBots is toggled, mark that we should apply bot filtering
  useEffect(() => {
    setShouldApplyBotFilter(true)
  }, [hideBots])

  // Apply bot filtering when needed
  useEffect(() => {
    if (shouldApplyBotFilter && allUsers.length > 0) {
      if (hideBots) {
        const nonBotUsers = allUsers.filter(user => {
          const userLogin = user.toLowerCase()
          return userLogin !== 'github-actions' && !userLogin.includes('dependabot')
        })
        setSelectedUsers(nonBotUsers)
      } else {
        // When hideBots is disabled, clear user selection to show all
        setSelectedUsers([])
      }
      setShouldApplyBotFilter(false)
    }
  }, [shouldApplyBotFilter, allUsers, hideBots])

  // Debug: Log PR counts
  const openPRs = prs.filter(pr => pr.state === 'open').length
  const closedPRs = prs.filter(pr => pr.state === 'closed').length
  console.log(`📊 PR Statistics: ${openPRs} open, ${closedPRs} closed, ${prs.length} total`)

  // State for dynamic counts that update when filteredPRs changes
  const [userCounts, setUserCounts] = useState<Record<string, number>>({})
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({})
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})

  // Update counts when filteredPRs changes
  useEffect(() => {
    const newUserCounts = allUsers.reduce((acc, user) => {
      if (!user) return acc
      acc[user] = filteredPRs.filter(pr => {
        // Count by creator OR assignees (same logic as filtering)
        const creatorLogin = pr.user?.login || ''
        const assigneeLogins = pr.assignees?.map(a => a.login || '') || []

        return creatorLogin === user || assigneeLogins.includes(user)
      }).length
      return acc
    }, {} as Record<string, number>)

    const newProjectCounts = allProjects.reduce((acc, project) => {
      acc[project] = filteredPRs.filter(pr => pr.repository?.name === project).length
      return acc
    }, {} as Record<string, number>)

    const newStatusCounts = {
      draft: filteredPRs.filter(pr => pr.draft).length,
      ready: filteredPRs.filter(pr => !pr.draft && pr.review_decision !== 'APPROVED' && pr.review_decision !== 'CHANGES_REQUESTED').length,
      approved: filteredPRs.filter(pr => pr.review_decision === 'APPROVED').length,
      changes: filteredPRs.filter(pr => pr.review_decision === 'CHANGES_REQUESTED').length
    }

    setUserCounts(newUserCounts)
    setProjectCounts(newProjectCounts)
    setStatusCounts(newStatusCounts)

    console.log('🔍 Counts updated:', {
      filteredPRsLength: filteredPRs.length,
      userCounts: Object.keys(newUserCounts).length,
      projectCounts: Object.keys(newProjectCounts).length,
      statusCounts: newStatusCounts
    })
  }, [filteredPRs, allUsers, allProjects])

  // Sort users and projects by count descending
  const sortedUsers = allUsers.filter(Boolean) as string[]
  const sortedProjects = allProjects.filter(Boolean) as string[]

  sortedUsers.sort((a, b) => (userCounts[b] || 0) - (userCounts[a] || 0))
  sortedProjects.sort((a, b) => (projectCounts[b] || 0) - (projectCounts[a] || 0))

  // Pagination logic
  const totalPages = Math.ceil(filteredPRs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPagePRs = filteredPRs.slice(startIndex, endIndex)

  // Debug: Log what's being displayed
  console.log('🔍 Display Debug:', {
    filteredPRsLength: filteredPRs.length,
    currentPagePRsLength: currentPagePRs.length,
    currentPage,
    totalPages,
    startIndex,
    endIndex
  })

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Toggle all functions for filters
  const toggleAllUsers = () => {
    if (selectedUsers.length === sortedUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers([...sortedUsers])
    }
  }

  const toggleAllProjects = () => {
    if (selectedProjects.length === sortedProjects.length) {
      setSelectedProjects([])
    } else {
      setSelectedProjects([...sortedProjects])
    }
  }

  const toggleAllStatuses = () => {
    const allStatuses = ['draft', 'ready', 'approved', 'changes']
    if (selectedStatuses.length === allStatuses.length) {
      setSelectedStatuses([])
    } else {
      setSelectedStatuses([...allStatuses])
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen font-sans">
        <div>Loading GitHub data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen font-sans">
        <div className="text-center">
          <h2 className="text-red-600">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="font-sans p-6 max-w-6xl mx-auto bg-slate-50 min-h-screen">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-800">
            Bravoure Pull Request Dashboard
          </h1>
          <p className="text-base text-gray-500 mb-2">
            Overview of all open pull requests across Bravoure repositories
          </p>
          {lastFetchTime && (
            <p className="text-sm text-gray-400">
              Last updated: {lastFetchTime}
              {isFromCache && (
                <span className="text-emerald-500 font-medium ml-2">
                  📦 (from cache)
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-3 items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showClosedPRs}
              onChange={(e) => setShowClosedPRs(e.target.checked)}
              className="m-0"
            />
            <span className="text-sm text-gray-700">
              Show closed PRs
            </span>
          </label>

          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className={`px-6 py-3 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 cursor-pointer'} text-white border-none rounded-lg text-sm font-medium flex items-center gap-2`}
          >
            {loading ? '⏳' : '🔄'} {loading ? 'Loading...' : 'Force Refresh'}
          </button>
        </div>
      </div>

      <StatsBar prs={filteredPRs} />

      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideBots}
              onChange={(e) => setHideBots(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Hide bot PRs (github-actions, dependabot)</span>
          </label>
        </div>

        <FilterBar
          users={sortedUsers}
          projects={sortedProjects}
          onUserFilter={setSelectedUsers}
          onProjectFilter={setSelectedProjects}
          onStatusFilter={setSelectedStatuses}
          selectedUsers={selectedUsers}
          selectedProjects={selectedProjects}
          selectedStatuses={selectedStatuses}
          userCounts={userCounts}
          projectCounts={projectCounts}
          statusCounts={statusCounts}
          onToggleAllUsers={toggleAllUsers}
          onToggleAllProjects={toggleAllProjects}
          onToggleAllStatuses={toggleAllStatuses}
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700 m-0">
            Pull Requests ({filteredPRs.length})
          </h2>

          {filteredPRs.length > 0 && (
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredPRs.length)} of {filteredPRs.length} results
            </div>
          )}
        </div>

        {filteredPRs.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
            No pull requests match the current filters
          </div>
        ) : (
          <div>
            {currentPagePRs.map(pr => (
              <PRCard key={pr.id} pr={pr} />
            ))}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8 p-4 bg-white rounded-lg border border-gray-200">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white cursor-pointer'} border-none rounded-md text-sm font-medium flex items-center gap-1`}
                >
                  ← Previous
                </button>

                <div className="flex gap-1 items-center">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-2 ${currentPage === pageNum ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'} border-none rounded-md text-sm font-medium cursor-pointer min-w-[40px]`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="text-gray-400">...</span>
                      <button
                        onClick={() => goToPage(totalPages)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 border-none rounded-md text-sm font-medium cursor-pointer min-w-[40px]"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white cursor-pointer'} border-none rounded-md text-sm font-medium flex items-center gap-1`}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
