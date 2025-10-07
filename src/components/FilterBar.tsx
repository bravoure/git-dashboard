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
  onToggleAllUsers: () => void
  onToggleAllProjects: () => void
  onToggleAllStatuses: () => void
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
  statusCounts,
  onToggleAllUsers,
  onToggleAllProjects,
  onToggleAllStatuses
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
    <div className="flex gap-4 mb-6 flex-wrap items-start">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Filter by User:
          </label>
          <button
            onClick={onToggleAllUsers}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {selectedUsers.length === users.length ? 'None' : 'All'}
          </button>
        </div>
        <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto border border-gray-300 rounded-md p-2 bg-white min-w-[200px]">
          {users.map(user => (
            <label key={user} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedUsers.includes(user)}
                onChange={() => handleUserChange(user)}
                className="m-0"
              />
              <span className="text-sm">
                {user} ({userCounts[user] || 0})
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Filter by Project:
          </label>
          <button
            onClick={onToggleAllProjects}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {selectedProjects.length === projects.length ? 'None' : 'All'}
          </button>
        </div>
        <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto border border-gray-300 rounded-md p-2 bg-white min-w-[200px]">
          {projects.map(project => (
            <label key={project} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedProjects.includes(project)}
                onChange={() => handleProjectChange(project)}
                className="m-0"
              />
              <span className="text-sm">
                {project} ({projectCounts[project] || 0})
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Filter by Status:
          </label>
          <button
            onClick={onToggleAllStatuses}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {selectedStatuses.length === 4 ? 'None' : 'All'}
          </button>
        </div>
        <div className="flex flex-col gap-1 border border-gray-300 rounded-md p-2 bg-white min-w-[200px]">
          {[
            { value: 'draft', label: 'Draft' },
            { value: 'ready', label: 'Ready for Review' },
            { value: 'approved', label: 'Approved' },
            { value: 'changes', label: 'Changes Requested' }
          ].map(status => (
            <label key={status.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedStatuses.includes(status.value)}
                onChange={() => handleStatusChange(status.value)}
                className="m-0"
              />
              <span className="text-sm">
                {status.label} ({statusCounts[status.value] || 0})
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-end">
        <button
          onClick={clearAllFilters}
          className="px-4 py-2 bg-gray-500 text-white border-none rounded-md text-sm cursor-pointer hover:bg-gray-600"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  )
}
