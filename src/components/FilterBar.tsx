import React from 'react'

interface FilterBarProps {
  users: string[]
  projects: string[]
  onUserFilter: (users: string[]) => void
  onProjectFilter: (projects: string[]) => void
  onStatusFilter: (statuses: string[]) => void
  selectedUsers: string[]
  selectedProjects: string[]
  selectedStatuses: string[]
  userCounts: Record<string, number>
  projectCounts: Record<string, number>
  statusCounts: Record<string, number>
}

export const FilterBar: React.FC<FilterBarProps> = ({
  users,
  projects,
  onUserFilter,
  onProjectFilter,
  onStatusFilter,
  selectedUsers,
  selectedProjects,
  selectedStatuses,
  userCounts,
  projectCounts,
  statusCounts
}) => {
  const handleUserChange = (user: string) => {
    if (selectedUsers.includes(user)) {
      onUserFilter(selectedUsers.filter(u => u !== user))
    } else {
      onUserFilter([...selectedUsers, user])
    }
  }

  const handleProjectChange = (project: string) => {
    if (selectedProjects.includes(project)) {
      onProjectFilter(selectedProjects.filter(p => p !== project))
    } else {
      onProjectFilter([...selectedProjects, project])
    }
  }

  const handleStatusChange = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onStatusFilter(selectedStatuses.filter(s => s !== status))
    } else {
      onStatusFilter([...selectedStatuses, status])
    }
  }

  const clearAllFilters = () => {
    onUserFilter([])
    onProjectFilter([])
    onStatusFilter([])
  }

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      flexWrap: 'wrap',
      alignItems: 'flex-start'
    }}>
      <div>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
          Filter by User:
        </label>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '8px',
          backgroundColor: 'white',
          minWidth: '200px'
        }}>
          {users.map(user => (
            <label key={user} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedUsers.includes(user)}
                onChange={() => handleUserChange(user)}
                style={{ margin: 0 }}
              />
              <span style={{ fontSize: '14px' }}>
                {user} ({userCounts[user] || 0})
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
          Filter by Project:
        </label>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '8px',
          backgroundColor: 'white',
          minWidth: '200px'
        }}>
          {projects.map(project => (
            <label key={project} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedProjects.includes(project)}
                onChange={() => handleProjectChange(project)}
                style={{ margin: 0 }}
              />
              <span style={{ fontSize: '14px' }}>
                {project} ({projectCounts[project] || 0})
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px', color: '#374151' }}>
          Filter by Status:
        </label>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '8px',
          backgroundColor: 'white',
          minWidth: '200px'
        }}>
          {[
            { value: 'draft', label: 'Draft' },
            { value: 'ready', label: 'Ready for Review' },
            { value: 'approved', label: 'Approved' },
            { value: 'changes', label: 'Changes Requested' }
          ].map(status => (
            <label key={status.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedStatuses.includes(status.value)}
                onChange={() => handleStatusChange(status.value)}
                style={{ margin: 0 }}
              />
              <span style={{ fontSize: '14px' }}>
                {status.label} ({statusCounts[status.value] || 0})
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <button
          onClick={clearAllFilters}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Clear All Filters
        </button>
      </div>
    </div>
  )
}
