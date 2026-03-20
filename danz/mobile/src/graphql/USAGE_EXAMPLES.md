# GraphQL Query Usage Examples

## Using the Consolidated Events Query

The single `GetEvents` query handles all event listing scenarios by using different filter combinations:

### 1. Get All Upcoming Events
```typescript
const { data } = useGetEventsQuery({
  variables: {
    filter: {
      status: 'upcoming'
    },
    pagination: { limit: 20, offset: 0 },
    sortBy: 'date_asc'
  }
})
```

### 2. Get Past Events
```typescript
const { data } = useGetEventsQuery({
  variables: {
    filter: {
      status: 'past'
    },
    pagination: { limit: 20, offset: 0 },
    sortBy: 'date_desc'
  }
})
```

### 3. Get Events Near Location
```typescript
const { data } = useGetEventsQuery({
  variables: {
    nearLocation: {
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      radius: 50 // 50km radius
    },
    filter: {
      status: 'upcoming'
    },
    sortBy: 'date_asc'
  }
})
```

### 4. Get My Registered Events
```typescript
const { data } = useGetEventsQuery({
  variables: {
    filter: {
      user_registered: true,
      status: 'upcoming'
    },
    sortBy: 'date_asc'
  }
})
```

### 5. Get Events I Created (for Organizers)
```typescript
const { data } = useGetEventsQuery({
  variables: {
    filter: {
      user_created: true
    },
    sortBy: 'date_desc'
  }
})
```

### 6. Get Events by Specific Organizer
```typescript
const { data } = useGetEventsQuery({
  variables: {
    filter: {
      facilitator_id: organizerId,
      status: 'upcoming'
    }
  }
})
```

### 7. Filter by Category and Skill Level
```typescript
const { data } = useGetEventsQuery({
  variables: {
    filter: {
      category: 'salsa',
      skill_level: 'beginner',
      status: 'upcoming'
    }
  }
})
```

### 8. Search with Multiple Filters
```typescript
const { data } = useGetEventsQuery({
  variables: {
    filter: {
      city: 'New York',
      dance_style: 'salsa',
      skill_level: 'all',
      minPrice: 0,
      maxPrice: 50,
      is_virtual: false,
      status: 'upcoming'
    },
    sortBy: 'price_asc'
  }
})
```

## User Profile with Stats

User statistics are now part of the User type, no separate query needed:

```typescript
// Get current user with all stats
const { data } = useGetMeQuery()
// Access stats directly: data.me.total_events_attended, data.me.dance_bonds_count, etc.

// Get another user's public profile with stats
const { data } = useGetUserQuery({
  variables: { id: userId }
})
// Access stats: data.user.total_events_attended, data.user.total_achievements, etc.
```

## Benefits of This Approach

1. **Single Source of Truth**: One query handles all event listing scenarios
2. **Reduced Complexity**: Fewer queries to maintain and test
3. **Better Performance**: Backend can optimize a single query better than multiple specialized ones
4. **Flexibility**: Frontend can easily combine filters without needing new queries
5. **Type Safety**: Single set of types to work with
6. **Cache Efficiency**: Apollo Client can better cache and reuse data from the same query