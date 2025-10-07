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
      filtered = filtered.filter(pr =>
        selectedUsers.includes(pr.user?.login || '') ||
        pr.assignees?.some(a => selectedUsers.includes(a.login)) ||
        pr.requested_reviewers?.some(r => selectedUsers.includes(r.login))
      )
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
  }, [prs, selectedUsers, selectedProjects, selectedStatuses, showClosedPRs])

  // Get all possible users and projects from all PRs (for filter options)
  const allUsers = Array.from(new Set([
    ...prs.map(pr => pr.user?.login).filter(Boolean),
    ...prs.flatMap(pr => pr.assignees?.map(a => a.login) || []),
    ...prs.flatMap(pr => pr.requested_reviewers?.map(r => r.login) || [])
  ]))

  const allProjects = Array.from(new Set(prs.map(pr => pr.repository?.name).filter(Boolean)))

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
      acc[user] = filteredPRs.filter(pr =>
        pr.user?.login === user ||
        pr.assignees?.some(a => a.login === user) ||
        pr.requested_reviewers?.some(r => r.login === user)
      ).length
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
  const sortedUsers = allUsers.sort((a, b) => (userCounts[b] || 0) - (userCounts[a] || 0))
  const sortedProjects = allProjects.sort((a, b) => (projectCounts[b] || 0) - (projectCounts[a] || 0))

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

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
      }}>
        <div>Loading GitHub data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#dc2626' }}>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: '#1f2937'
          }}>
            Bravoure Pull Request Dashboard
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '8px'
          }}>
            Overview of all open pull requests across Bravoure repositories
          </p>
          {lastFetchTime && (
            <p style={{
              fontSize: '14px',
              color: '#9ca3af'
            }}>
              Last updated: {lastFetchTime}
              {isFromCache && (
                <span style={{
                  color: '#10b981',
                  fontWeight: '500',
                  marginLeft: '8px'
                }}>
                  📦 (from cache)
                </span>
              )}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showClosedPRs}
              onChange={(e) => setShowClosedPRs(e.target.checked)}
              style={{ margin: 0 }}
            />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              Show closed PRs
            </span>
          </label>

          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading ? '⏳' : '🔄'} {loading ? 'Loading...' : 'Force Refresh'}
          </button>
        </div>
      </div>

      <StatsBar prs={filteredPRs} />

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
      />

      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#374151',
            margin: 0
          }}>
            Pull Requests ({filteredPRs.length})
          </h2>

          {filteredPRs.length > 0 && (
            <div style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredPRs.length)} of {filteredPRs.length} results
            </div>
          )}
        </div>

        {filteredPRs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px',
            color: '#6b7280',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            No pull requests match the current filters
          </div>
        ) : (
          <div>
            {currentPagePRs.map(pr => (
              <PRCard key={pr.id} pr={pr} />
            ))}

            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginTop: '32px',
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: currentPage === 1 ? '#f3f4f6' : '#3b82f6',
                    color: currentPage === 1 ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ← Previous
                </button>

                <div style={{
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center'
                }}>
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
                        style={{
                          padding: '8px 12px',
                          backgroundColor: currentPage === pageNum ? '#3b82f6' : '#f3f4f6',
                          color: currentPage === pageNum ? 'white' : '#374151',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          minWidth: '40px'
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span style={{ color: '#9ca3af' }}>...</span>
                      <button
                        onClick={() => goToPage(totalPages)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          minWidth: '40px'
                        }}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: currentPage === totalPages ? '#f3f4f6' : '#3b82f6',
                    color: currentPage === totalPages ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
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
