<script lang='ts'>
	// IMPORTS AND SETUP
	import { createClient } from '@supabase/supabase-js';
	import type { RealtimeChannel } from '@supabase/supabase-js';
  
	// Supabase configuration
	const SUPABASE_URL = 'https://etatllfntoohgjpkimws.supabase.co';
	const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0YXRsbGZudG9vaGdqcGtpbXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MDAzMTQsImV4cCI6MjA1OTE3NjMxNH0.gEjSVfseiLuoMzi_YQA8wCmCWiynmmhhLa8JWAeOnYo';
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
	
	// ============= STATE MANAGEMENT =============
	// Authentication state
	let username = $state('');
	let password = $state('');
	let authStatus = $state('Not logged in');
	
	// Channel management state
	let channel: RealtimeChannel | null = $state(null);
	let allChannels: string[] = $state([]);
	let channelName = $state('');
	let channelId: string | null = $state('');
	
	// Postgres channels state
	let postgresChannel = $state('');
	let postgresInsertsChannel = $state('');
	let postgresUpdatesChannel = $state('');
	let postgresDeletesChannel = $state('');
    let postgresDeletesChannelV2 = $state('');
	
	// Broadcast state
	let broadcastChannel = $state('');
	let broadcastMessage = $state('');

    // Presence state
    let presenceChannel = $state('');
	
	// Response data state
	let todosValues = $state('');
	let postgresPublicChanges = $state('');
	let postgresInserts = $state('');
	let postgresUpdates = $state('');
	let postgresDeletes = $state('');
	let broadcastMessageReceived = $state('');
	let listenToDeletesV2 = $state('');
    let joinState = $state('');
    let leaveState = $state('');
    let syncState = $state('');

    // UI state
    let activeTab = $state('authentication');
    let showCode = $state<Record<string, boolean>>({
        createTable: false,
        enableRLS: false,
        insertData: false,
        triggerSetup: false
    });
	
	$inspect(allChannels);
  
	// ============= AUTHENTICATION FUNCTIONS =============
	const login = async () => {
		try {
            authStatus = 'Logging in...';
			const { data, error } = await supabase.auth.signInWithPassword({
				email: username || 'brian@supabase.io',
				password: password || 'Password123'
			});
			
			if (error) {
				console.error('Login error:', error.message);
                authStatus = `Login failed: ${error.message}`;
				return;
			}
			
			console.log('Successfully logged in:', data);
            authStatus = `Logged in as ${data.user?.email}`;
		} catch (err) {
			console.error('Login exception:', err);
            authStatus = `Login exception: ${err instanceof Error ? err.message : String(err)}`;
		}
	};
	
	const signout = async () => {
		try {
            authStatus = 'Signing out...';
			const { error } = await supabase.auth.signOut();
			
			if (error) {
				console.error('Sign out error:', error.message);
                authStatus = `Sign out failed: ${error.message}`;
				return;
			}
			
			console.log('Successfully signed out');
            authStatus = 'Signed out';
		} catch (err) {
			console.error('Sign out exception:', err);
            authStatus = `Sign out exception: ${err instanceof Error ? err.message : String(err)}`;
		}
	};
  
	// ============= CHANNEL MANAGEMENT FUNCTIONS =============
	const listAllChannels = () => {
		try {
			allChannels = supabase.getChannels().map(ch => ch.subTopic);
			console.log('Retrieved channels:', allChannels);
            return allChannels;
		} catch (error) {
			console.error('Error listing channels:', error);
            return [];
		}
	};
  
	const createChannel = async () => {
		if (!channelName) {
			console.warn('Channel name is required');
			return;
		}
		
		try {
			channel = supabase.channel(channelName);
			console.log('Channel created:', channelName);
			listAllChannels(); // Refresh channel list
		} catch (error) {
			console.error('Error creating channel:', error);
		}
	};
  
	const unsubscribeFromChannel = () => {
		if (!channelId) {
			console.warn('No channel selected to unsubscribe from');
			return;
		}
		
		try {
			const activeChannels = supabase.getChannels();
			const activeChannel = activeChannels.find(ch => ch.subTopic === channelId);
			
			if (activeChannel) {
				supabase.removeChannel(activeChannel);
				console.log('Unsubscribed from channel:', channelId);
				listAllChannels(); // Refresh channel list
			} else {
				console.warn('Channel not found:', channelId);
			}
		} catch (error) {
			console.error('Error unsubscribing from channel:', error);
		}
	};
  
	const unsubscribeFromAllChannels = () => {
		try {
			supabase.removeAllChannels();
			channel = null;
			postgresChannel = '';
			allChannels = [];
			console.log('Successfully unsubscribed from all channels');
		} catch (error) {
			console.error('Error unsubscribing from all channels:', error);
		}
	};
  
	// ============= POSTGRES FUNCTIONS =============
	const listenToPublicChanges = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for Postgres public changes');
			return;
		}
		
		try {
			console.log('Listening to public changes on channel:', selectedChannel);
			postgresPublicChanges = 'Subscribing to public changes...';
			
			supabase
				.channel(selectedChannel)
				.on(
					'postgres_changes',
					{
						event: '*',
						schema: 'public',
					},
					(payload) => {
						console.log('Postgres public change received:', payload);
						postgresPublicChanges = JSON.stringify(payload, null, 2);
					}
				)
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to public changes');
						postgresPublicChanges += '\nSubscribed. Waiting for events...';
					} else if (err) {
						console.error('Error subscribing to public changes:', err);
						postgresPublicChanges = `Error: ${err.message || 'Unknown error'}`;
					}
				});
		} catch (error) {
			console.error('Error setting up public changes listener:', error);
			postgresPublicChanges = `Exception: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	const listenToInsertsOnTodo = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for INSERT events');
			return;
		}
		
		try {
			console.log('Listening to INSERT events on channel:', selectedChannel);
			postgresInserts = 'Subscribing to INSERT events...';
			
			supabase
				.channel(selectedChannel)
				.on(
					'postgres_changes',
					{
						event: 'INSERT',
						schema: 'public',
						table: 'todos',
					},
					(payload) => {
						console.log('INSERT event received:', payload);
						postgresInserts = JSON.stringify(payload, null, 2);
					}
				)
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to INSERT events');
						postgresInserts += '\nSubscribed. Waiting for INSERT events...';
					} else if (err) {
						console.error('Error subscribing to INSERT events:', err);
						postgresInserts = `Error: ${err.message || 'Unknown error'}`;
					}
				});
		} catch (error) {
			console.error('Error setting up INSERT listener:', error);
			postgresInserts = `Exception: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	const listenToUpdatesOnTodo = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for UPDATE events');
			return;
		}
		
		try {
			console.log('Listening to UPDATE events on channel:', selectedChannel);
			postgresUpdates = 'Subscribing to UPDATE events...';
			
			supabase
				.channel(selectedChannel)
				.on(
					'postgres_changes',
					{
						event: 'UPDATE',
						schema: 'public',
						table: 'todos',
					},
					(payload) => {
						console.log('UPDATE event received:', payload);
						postgresUpdates = JSON.stringify(payload, null, 2);
					}
				)
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to UPDATE events');
						postgresUpdates += '\nSubscribed. Waiting for UPDATE events...';
					} else if (err) {
						console.error('Error subscribing to UPDATE events:', err);
						postgresUpdates = `Error: ${err.message || 'Unknown error'}`;
					}
				});
		} catch (error) {
			console.error('Error setting up UPDATE listener:', error);
			postgresUpdates = `Exception: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	const listenToDeletesOnTodo = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for DELETE events');
			return;
		}
		
		try {
			console.log('Listening to DELETE events on channel:', selectedChannel);
			postgresDeletes = 'Subscribing to DELETE events...';
			
			supabase
				.channel(selectedChannel)
				.on(
					'postgres_changes',
					{
						event: 'DELETE',
						schema: 'public',
						table: 'todos',
					},
					(payload) => {
						console.log('DELETE event received:', payload);
						postgresDeletes = JSON.stringify(payload, null, 2);
					}
				)
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to DELETE events');
						postgresDeletes += '\nSubscribed. Waiting for DELETE events...';
					} else if (err) {
						console.error('Error subscribing to DELETE events:', err);
						postgresDeletes = `Error: ${err.message || 'Unknown error'}`;
					}
				});
		} catch (error) {
			console.error('Error setting up DELETE listener:', error);
			postgresDeletes = `Exception: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	// ============= BROADCAST FUNCTIONS =============
	const listenToBroadcast = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for broadcast events');
			return;
		}
		
		try {
			console.log('Listening to broadcast events on channel:', selectedChannel);
			broadcastMessageReceived = 'Subscribing to broadcast events...';
			
			supabase
				.channel(selectedChannel)
				.on(
					'broadcast',
					{ event: 'shout' },
					(payload) => {
						console.log('Broadcast received:', payload);
						broadcastMessageReceived = JSON.stringify(payload, null, 2);
					}
				)
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to broadcast events');
						broadcastMessageReceived += '\nSubscribed. Waiting for broadcasts...';
					} else if (err) {
						console.error('Error subscribing to broadcast events:', err);
						broadcastMessageReceived = `Error: ${err.message || 'Unknown error'}`;
					}
				});
		} catch (error) {
			console.error('Error setting up broadcast listener:', error);
			broadcastMessageReceived = `Exception: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	const sendBroadcast = (selectedChannel: string, message: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for sending broadcast');
			return;
		}
		
		if (!message.trim()) {
			console.warn('No message provided for broadcast');
			return;
		}
		
		try {
			console.log('Sending broadcast on channel:', selectedChannel, 'with message:', message);
			
			supabase
				.channel(selectedChannel)
				.send({
					type: 'broadcast',
					event: 'shout',
					payload: { message },
				})
				.then(() => {
					console.log('Broadcast sent successfully');
					broadcastMessage = ''; // Clear input after sending
				})
				.catch((err) => {
					console.error('Error sending broadcast:', err);
					alert(`Error sending broadcast: ${err.message || 'Unknown error'}`);
				});
		} catch (error) {
			console.error('Exception sending broadcast:', error);
			alert(`Exception sending broadcast: ${error instanceof Error ? error.message : String(error)}`);
		}
	};

	// ============= PRESENCE FUNCTIONS =============
	const listenToSync = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for presence sync events');
			return;
		}
		
		try {
			console.log('Listening to presence sync events on channel:', selectedChannel);
			syncState = 'Subscribing to presence sync events...';
			
			supabase
				.channel(selectedChannel)
				.on(
					'presence',
					{ event: 'sync' },
					(payload) => {
						console.log('Presence sync event received:', payload);
						syncState = JSON.stringify(payload, null, 2);
					}
				)
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to presence sync events');
						syncState += '\nSubscribed. Waiting for sync events...';
					} else if (err) {
						console.error('Error subscribing to presence sync events:', err);
						syncState = `Error: ${err.message || 'Unknown error'}`;
					}
				});
		} catch (error) {
			console.error('Error setting up presence sync listener:', error);
			syncState = `Exception: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	const listenToJoin = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for presence join events');
			return;
		}
		
		try {
			console.log('Listening to presence join events on channel:', selectedChannel);
			joinState = 'Subscribing to join events...';
			
			supabase
				.channel(selectedChannel)
				.on(
					'presence',
					{ event: 'join' },
					(payload) => {
						console.log('Presence join event received:', payload);
                        joinState = JSON.stringify(payload, null, 2);
					}
				)
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to presence join events');
						joinState += '\nSubscribed. Waiting for join events...';
					} else if (err) {
						console.error('Error subscribing to presence join events:', err);
						joinState = `Error: ${err.message || 'Unknown error'}`;
					}
				});
		} catch (error) {
			console.error('Error setting up presence join listener:', error);
			joinState = `Exception: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	const listenToLeave = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for presence leave events');
			return;
		}
		
		try {
			console.log('Listening to presence leave events on channel:', selectedChannel);
			leaveState = 'Subscribing to leave events...';
			
			supabase
				.channel(selectedChannel)
				.on(
					'presence',
					{ event: 'leave' },
					(payload) => {
						console.log('Presence leave event received:', payload);
                        leaveState = JSON.stringify(payload, null, 2);
					}
				)
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to presence leave events');
						leaveState += '\nSubscribed. Waiting for leave events...';
					} else if (err) {
						console.error('Error subscribing to presence leave events:', err);
						leaveState = `Error: ${err.message || 'Unknown error'}`;
					}
				});
		} catch (error) {
			console.error('Error setting up presence leave listener:', error);
			leaveState = `Exception: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

    const listenToPresence = async (room: string) => {
        if (!room) {
            console.warn('No room provided for presence');
            return;
        }
        
        try {
            console.log('Setting up presence listener for room:', room);
            syncState = 'Setting up presence listener...';
            
            const channel = supabase.channel(room);
            
            channel
                .on('presence', { event: 'sync' }, () => {
                    const newState = channel.presenceState();
                    console.log('Presence state updated:', newState);
                    syncState = JSON.stringify(newState, null, 2);
                })
                .subscribe((status, err) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('Successfully subscribed to presence events');
                        syncState += '\nSubscribed. Waiting for presence updates...';
                    } else if (err) {
                        console.error('Error subscribing to presence events:', err);
                        syncState = `Error: ${err.message || 'Unknown error'}`;
                    }
                });
        } catch (error) {
            console.error('Error setting up presence listener:', error);
            syncState = `Exception: ${error instanceof Error ? error.message : String(error)}`;
        }
    };

	// ============= DATABASE OPERATIONS =============
	const insertIntoTodos = async () => {
		try {
			const randomVal = Math.floor(Math.random() * 10);
			console.log('Inserting random value into todos:', randomVal);
			todosValues = 'Inserting random value...';
			
			const { data, error } = await supabase
				.from('todos')
				.insert({ random_value: randomVal });
			
			if (error) {
				console.error('Error inserting into todos:', error);
				todosValues = `Error inserting: ${error.message}`;
				return;
			}
			
			console.log('Successfully inserted into todos:', data);
			await getTodos(); // Refresh todos list
		} catch (error) {
			console.error('Exception inserting into todos:', error);
			todosValues = `Exception inserting: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	const updateTodo = async () => {
		try {
			const randomVal = Math.floor(Math.random() * 10);
			console.log('Updating todos with random value:', randomVal);
			todosValues = 'Updating todos...';
			
			const { data, error } = await supabase
				.from('todos')
				.update({ random_value: randomVal })
				.gt('random_value', 2);
			
			if (error) {
				console.error('Error updating todos:', error);
				todosValues = `Error updating: ${error.message}`;
				return;
			}
			
			console.log('Successfully updated todos:', data);
			await getTodos(); // Refresh todos list
		} catch (error) {
			console.error('Exception updating todos:', error);
			todosValues = `Exception updating: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	const deleteTodo = async () => {
		try {
			console.log('Deleting all values from todos');
			todosValues = 'Deleting todos...';
			
			const { data, error } = await supabase
				.from('todos')
				.delete()
                .gt('id', 0);
			
			if (error) {
				console.error('Error deleting from todos:', error);
				todosValues = `Error deleting: ${error.message}`;
				return;
			}
			
			console.log('Successfully deleted from todos:', data);
			await getTodos(); // Refresh todos list
		} catch (error) {
			console.error('Exception deleting from todos:', error);
			todosValues = `Exception deleting: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	const getTodos = async () => {
		try {
			console.log('Fetching todos');
			todosValues = 'Loading todos...';
			
			const { data, error } = await supabase
				.from('todos')
				.select('*');
			
			if (error) {
				console.error('Error fetching todos:', error);
				todosValues = `Error fetching todos: ${error.message}`;
				return;
			}
			
			console.log('Successfully fetched todos:', data);
			todosValues = data.length > 0 
                ? JSON.stringify(data, null, 2)
                : 'No todos found.';
		} catch (error) {
			console.error('Exception fetching todos:', error);
			todosValues = `Exception fetching todos: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	// ============= REALTIME V2 FUNCTIONS =============
	const listenToDeleteV2 = async (id: string) => {
		if (!id) {
            console.warn('No channel ID provided for DELETE V2 listener');
            return;
        }
        
		try {
			console.log('Setting up DELETE V2 listener');
			listenToDeletesV2 = 'Setting up DELETE V2 listener...';
			
			await supabase.realtime.setAuth(); // Needed for Realtime Authorization
			
			supabase
				.channel(`topic:${id}`, {
					config: { private: true },
				})
				.on('broadcast', { event: 'DELETE' }, (payload) => {
					console.log('DELETE V2 event received:', payload);
					listenToDeletesV2 = JSON.stringify(payload, null, 2);
				})
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to DELETE V2 events');
						listenToDeletesV2 += '\nSubscribed. Waiting for DELETE V2 events...';
					} else if (err) {
						console.error('Error subscribing to DELETE V2 events:', err);
						listenToDeletesV2 = `Error: ${err.message || 'Unknown error'}`;
					}
				});
		} catch (error) {
			console.error('Exception setting up DELETE V2 listener:', error);
			listenToDeletesV2 = `Exception: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

    // Helper function to toggle code visibility
    const toggleCode = (section: string) => {
        showCode[section] = !showCode[section];
    };

</script>

<div class="app-container">
    <header class="header">
        <h1>Supabase Realtime Testing Tool</h1>
        <p>A testing tool for Supabase realtime features</p>
    </header>

    <nav class="tabs">
        <ul>
            <li class={activeTab === 'authentication' ? 'active' : ''}>
                <button onclick={() => activeTab = 'authentication'}>Authentication</button>
            </li>
            <li class={activeTab === 'channels' ? 'active' : ''}>
                <button onclick={() => activeTab = 'channels'}>Channel Management</button>
            </li>
            <li class={activeTab === 'database' ? 'active' : ''}>
                <button onclick={() => activeTab = 'database'}>Database Operations</button>
            </li>
            <li class={activeTab === 'postgres' ? 'active' : ''}>
                <button onclick={() => activeTab = 'postgres'}>Postgres Changes</button>
            </li>
            <li class={activeTab === 'broadcast' ? 'active' : ''}>
                <button onclick={() => activeTab = 'broadcast'}>Broadcast</button>
            </li>
            <li class={activeTab === 'presence' ? 'active' : ''}>
                <button onclick={() => activeTab = 'presence'}>Presence</button>
            </li>
            <li class={activeTab === 'v2' ? 'active' : ''}>
                <button onclick={() => activeTab = 'v2'}>Postgres Changes V2</button>
            </li>
        </ul>
    </nav>

    <main class="content">
        {#if activeTab === 'authentication'}
            <!-- Authentication Section -->
            <section class="auth-section card">
                <h2>Authentication</h2>
                <div class="form-group">
                    <label for="username">Email</label>
                    <input id="username" bind:value={username} placeholder="Email" />
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input id="password" bind:value={password} placeholder="Password" type="password" />
                </div>
                <div class="button-group">
                    <button class="btn primary" onclick={login}>Login</button>
                    <button class="btn secondary" onclick={signout}>Sign Out</button>
                </div>
                <div class="status-box">
                    <strong>Status:</strong> {authStatus}
                </div>
            </section>
        {/if}

        {#if activeTab === 'channels'}
            <!-- Channel Management Section -->
            <section class="card">
                <h2>Channel Management</h2>
                
                <div class="panel">
                    <h3>Create Channel</h3>
                    <div class="form-group">
                        <input bind:value={channelName} placeholder="New Channel Name" />
                        <button class="btn primary" onclick={createChannel}>Create Channel</button>
                    </div>
                </div>
                
                <div class="panel">
                    <h3>Channel List</h3>
                    <button class="btn secondary" onclick={() => listAllChannels()}>Refresh Channel List</button>
                    
                    <div class="channel-list">
                        {#if allChannels.length === 0}
                            <p>No channels available</p>
                        {:else}
                            {#each allChannels as ch}
                                <div class="channel-item">{ch}</div>
                            {/each}
                        {/if}
                    </div>
                </div>
                
                <div class="panel">
                    <h3>Unsubscribe from Channel</h3>
                    <div class="form-group">
                        <select bind:value={channelId} onfocus={() => listAllChannels()}>
                            <option value={null}>Select a channel</option>
                            {#each allChannels as ch}
                                <option value={ch}>{ch}</option>
                            {/each}
                        </select>
                        <button class="btn warning" onclick={unsubscribeFromChannel}>Unsubscribe</button>
                    </div>
                    <small>(will also remove channels without a subscription)</small>
                </div>
                
                <div class="panel">
                    <button class="btn danger" onclick={unsubscribeFromAllChannels}>Unsubscribe from All Channels</button>
                </div>
            </section>
        {/if}

        {#if activeTab === 'database'}
            <!-- Database Operations Section -->
            <section class="card">
                <h2>Database Operations</h2>
                
                <div class="panel">
                    <h3>Table Setup Instructions</h3>
                    <div class="collapsible">
                        <button class="code-toggle" onclick={() => toggleCode('createTable')}>
                            {showCode.createTable ? 'Hide SQL' : 'Show SQL'}: Create Example Table
                        </button>
                        {#if showCode.createTable}
                            <pre class="code-block">
create table if not exists public.todos (
    id serial not null,
    random_value int null,
    constraint todos_pkey primary key (id)
);
                            </pre>
                        {/if}
                    </div>
                    
                    <div class="collapsible">
                        <button class="code-toggle" onclick={() => toggleCode('enableRLS')}>
                            {showCode.enableRLS ? 'Hide SQL' : 'Show SQL'}: Enable Row Level Security
                        </button>
                        {#if showCode.enableRLS}
                            <pre class="code-block">
-- Turn on security
alter table "todos"
enable row level security;

-- Allow authenticated access
create policy "Allow authenticated access"
on todos
for all
to authenticated
using (true);
                            </pre>
                        {/if}
                    </div>
                    
                    <div class="collapsible">
                        <button class="code-toggle" onclick={() => toggleCode('insertData')}>
                            {showCode.insertData ? 'Hide SQL' : 'Show SQL'}: Insert Example Data
                        </button>
                        {#if showCode.insertData}
                            <pre class="code-block">
insert into public.todos (random_value) 
values 
(1),
(2),
(3),
(4);
                            </pre>
                        {/if}
                    </div>
                    
                    <div class="note">
                        <p>
                            <strong>Note:</strong> The validation is done when the user connects. If you update RLS during a conversation, 
                            the user will not be impacted unless the connection is reloaded. For advanced examples, use the 
                            <a href='https://supabase.com/docs/guides/realtime/authorization'>realtime Auth guide</a>.
                        </p>
                    </div>
                </div>

                <div class="panel">
                    <h3>Todos Operations</h3>
                    <div class="button-group">
                        <button class="btn primary" onclick={getTodos}>Get Todos</button>
                        <button class="btn secondary" onclick={insertIntoTodos}>Insert Random Value</button>
                        <button class="btn warning" onclick={updateTodo}>Update Random Value</button>
                        <button class="btn danger" onclick={deleteTodo}>Delete All Todos</button>
                    </div>
                    
                    <div class="result-box">
                        <h4>Results:</h4>
                        <pre>{todosValues}</pre>
                    </div>
                </div>
            </section>
        {/if}

        {#if activeTab === 'postgres'}
            <!-- Postgres Changes Section -->
            <section class="card">
                <h2>Standard Postgres Changes</h2>
                
                <div class="panel">
                    <h3>Listen to All Changes in Public Schema</h3>
                    <div class="form-group">
                        <select bind:value={postgresChannel} onfocus={() => listAllChannels()}>
                            <option value={null}>Select a channel</option>
                            {#each allChannels as ch}
                                <option value={ch}>{ch}</option>
                            {/each}
                        </select>
                        <button class="btn primary" onclick={() => listenToPublicChanges(postgresChannel)}>
                            Listen to All Changes
                        </button>
                    </div>
                    <div class="result-box">
                        <pre>{postgresPublicChanges}</pre>
                    </div>
                </div>
                
                <div class="panel">
                    <h3>Listen to INSERT Events on Todo Table</h3>
                    <div class="form-group">
                        <select bind:value={postgresInsertsChannel} onfocus={() => listAllChannels()}>
                            <option value={null}>Select a channel</option>
                            {#each allChannels as ch}
                                <option value={ch}>{ch}</option>
                            {/each}
                        </select>
                        <button class="btn primary" onclick={() => listenToInsertsOnTodo(postgresInsertsChannel)}>
                            Listen to INSERTs
                        </button>
                    </div>
                    <div class="result-box">
                        <pre>{postgresInserts}</pre>
                    </div>
                </div>
                
                <div class="panel">
                    <h3>Listen to UPDATE Events on Todo Table</h3>
                    <div class="form-group">
                        <select bind:value={postgresUpdatesChannel} onfocus={() => listAllChannels()}>
                            <option value={null}>Select a channel</option>
                            {#each allChannels as ch}
                                <option value={ch}>{ch}</option>
                            {/each}
                        </select>
                        <button class="btn primary" onclick={() => listenToUpdatesOnTodo(postgresUpdatesChannel)}>
                            Listen to UPDATEs
                        </button>
                    </div>
                    <div class="result-box">
                        <pre>{postgresUpdates}</pre>
                    </div>
                </div>
                
                <div class="panel">
                    <h3>Listen to DELETE Events on Todo Table</h3>
                    <div class="form-group">
                        <select bind:value={postgresDeletesChannel} onfocus={() => listAllChannels()}>
                            <option value={null}>Select a channel</option>
                            {#each allChannels as ch}
                                <option value={ch}>{ch}</option>
                            {/each}
                        </select>
                        <button class="btn primary" onclick={() => listenToDeletesOnTodo(postgresDeletesChannel)}>
                            Listen to DELETEs
                        </button>
                    </div>
                    <div class="result-box">
                        <pre>{postgresDeletes}</pre>
                    </div>
                </div>
            </section>
        {/if}

        {#if activeTab === 'broadcast'}
            <!-- Broadcasts Section -->
            <section class="card">
                <h2>Broadcasts</h2>
                
                <div class="panel">
                    <h3>Listen to Broadcasts</h3>
                    <div class="form-group">
                        <select bind:value={broadcastChannel} onfocus={() => listAllChannels()}>
                            <option value={null}>Select a channel</option>
                            {#each allChannels as ch}
                                <option value={ch}>{ch}</option>
                            {/each}
                        </select>
                        <button class="btn primary" onclick={() => listenToBroadcast(broadcastChannel)}>
                            Listen to Broadcasts
                        </button>
                    </div>
                    <div class="result-box">
                        <pre>{broadcastMessageReceived}</pre>
                    </div>
                </div>
                
                <div class="panel">
                    <h3>Send Broadcast</h3>
                    <div class="form-group">
                        <select bind:value={broadcastChannel} onfocus={() => listAllChannels()}>
                            <option value={null}>Select a channel</option>
                            {#each allChannels as ch}
                                <option value={ch}>{ch}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="form-group">
                        <input bind:value={broadcastMessage} placeholder="Message" />
                        <button class="btn primary" onclick={() => sendBroadcast(broadcastChannel, broadcastMessage)}>
                            Send Broadcast
                        </button>
                    </div>
                </div>
            </section>
        {/if}

        {#if activeTab === 'presence'}
            <!-- Presence Section -->
            <section class="card">
                <h2>Presence Functions</h2>
                
                <div class="panel">
                    <h3>Listen to Join Events</h3>
                    <div class="form-group">
                        <select bind:value={presenceChannel} onfocus={() => listAllChannels()}>
                            <option value={null}>Select a channel</option>
                            {#each allChannels as ch}
                                <option value={ch}>{ch}</option>
                            {/each}
                        </select>
                        <button class="btn primary" onclick={() => listenToJoin(presenceChannel)}>
                            Listen to Users Join
                        </button>
                    </div>
                    <div class="result-box">
                        <pre>{joinState}</pre>
                    </div>
                </div>
                
                <div class="panel">
                    <h3>Listen to Leave Events</h3>
                    <p>Get notified when users leave a room</p>
                    <div class="form-group">
                        <select bind:value={presenceChannel} onfocus={() => listAllChannels()}>
                            <option value={null}>Select a channel</option>
                            {#each allChannels as ch}
                                <option value={ch}>{ch}</option>
                            {/each}
                        </select>
                        <button class="btn primary" onclick={() => listenToLeave(presenceChannel)}>
                            Listen to Users Leave
                        </button>
                    </div>
                    <div class="result-box">
                        <pre>{leaveState}</pre>
                    </div>
                </div>
                
                <div class="panel">
                    <h3>Listen to Sync Events</h3>
                    <p>See all trackable users in a room</p>
                    <div class="form-group">
                        <select bind:value={presenceChannel} onfocus={() => listAllChannels()}>
                            <option value={null}>Select a channel</option>
                            {#each allChannels as ch}
                                <option value={ch}>{ch}</option>
                            {/each}
                        </select>
                        <button class="btn primary" onclick={() => listenToSync(presenceChannel)}>
                            Listen to Sync Events
                        </button>
                    </div>
                    <div class="result-box">
                        <pre>{syncState}</pre>
                    </div>
                </div>
                
                <div class="panel">
                    <h3>Full Presence Tracking</h3>
                    <p>Track presence state for a room</p>
                    <div class="form-group">
                        <select bind:value={presenceChannel} onfocus={() => listAllChannels()}>
                            <option value={null}>Select a channel</option>
                            {#each allChannels as ch}
                                <option value={ch}>{ch}</option>
                            {/each}
                        </select>
                        <button class="btn primary" onclick={() => listenToPresence(presenceChannel)}>
                            Track Room Presence
                        </button>
                    </div>
                    <div class="result-box">
                        <pre>{syncState}</pre>
                    </div>
                </div>
            </section>
        {/if}

        {#if activeTab === 'v2'}
            <!-- Postgres Changes V2 Section -->
            <section class="card">
                <h2>Broadcast Postgres Changes V2</h2>
                
                <div class="panel">
                    <h3>Benefits</h3>
                    <ul class="benefit-list">
                        <li>Scales better with many connected users</li>
                        <li>Sanitizes the payload of a message instead of providing the full record</li>
                        <li>Reduces latency of sent messages</li>
                    </ul>
                </div>
                
                <div class="panel">
                    <h3>Setup Instructions</h3>
                    
                    <div class="collapsible">
                        <button class="code-toggle" onclick={() => toggleCode('triggerSetup')}>
                            {showCode.triggerSetup ? 'Hide SQL' : 'Show SQL'}: Set up Trigger on Target Table
                        </button>
                        {#if showCode.triggerSetup}
                            <pre class="code-block">
create or replace function public.your_table_changes()
returns trigger
as $$
begin
    perform realtime.broadcast_changes(
        'topic:' || new.id::text,   -- topic
        tg_op,                      -- event
        tg_op,                      -- operation
        tg_table_name,              -- table
        tg_table_schema,            -- schema
        new,                        -- new record
        old                         -- old record
    );
    return null;
end;
$$ language plpgsql;

-- Create trigger
create trigger broadcast_changes_for_your_table_trigger
after insert or update or delete
on public.your_table
for each row
execute function your_table_changes();
                            </pre>
                        {/if}
                    </div>
                </div>
                
                <div class="panel">
                    <h3>Listen to DELETE V2 Events</h3>
                    <div class="form-group">
                        <select bind:value={postgresDeletesChannelV2} onfocus={() => listAllChannels()}>
                            <option value={null}>Select a channel</option>
                            {#each allChannels as ch}
                                <option value={ch}>{ch}</option>
                            {/each}
                        </select>
                        <button class="btn primary" onclick={() => listenToDeleteV2(postgresDeletesChannelV2)}>
                            Listen to Deletes V2
                        </button>
                    </div>
                    <div class="result-box">
                        <pre>{listenToDeletesV2}</pre>
                    </div>
                </div>
            </section>
        {/if}
    </main>

    <footer class="footer">
        <p>Supabase Realtime Testing Tool - <a href="https://supabase.com/docs/guides/realtime" target="_blank">Documentation</a></p>
    </footer>
</div>

<style>
    /* Base styles */
    :global(body) {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f5f7fa;
        margin: 0;
        padding: 0;
    }

    .app-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
    }

    /* Header */
    .header {
        text-align: center;
        margin-bottom: 30px;
    }

    .header h1 {
        color: #3ecf8e;
        margin-bottom: 5px;
    }

    .header p {
        color: #666;
        margin-top: 0;
    }

    /* Navigation Tabs */
    .tabs {
        margin-bottom: 30px;
    }

    .tabs ul {
        display: flex;
        list-style: none;
        padding: 0;
        margin: 0;
        border-bottom: 1px solid #ddd;
        overflow-x: auto;
    }

    .tabs li {
        margin-right: 5px;
    }

    .tabs li button {
        padding: 10px 20px;
        border: none;
        background: none;
        cursor: pointer;
        color: #666;
        font-weight: 500;
        border-bottom: 3px solid transparent;
        transition: all 0.2s;
    }

    .tabs li.active button {
        color: #3ecf8e;
        border-bottom: 3px solid #3ecf8e;
    }

    .tabs li button:hover {
        color: #3ecf8e;
    }

    /* Card */
    .card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        padding: 20px;
        margin-bottom: 30px;
    }

    .card h2 {
        color: #333;
        margin-top: 0;
        padding-bottom: 15px;
        border-bottom: 1px solid #f0f0f0;
    }

    /* Panel */
    .panel {
        margin-bottom: 25px;
        padding-bottom: 20px;
        border-bottom: 1px solid #f0f0f0;
    }

    .panel:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }

    .panel h3 {
        color: #444;
        margin-top: 0;
        margin-bottom: 15px;
        font-size: 1.1rem;
    }

    /* Form elements */
    .form-group {
        margin-bottom: 15px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
    }

    input, select {
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        flex-grow: 1;
        min-width: 200px;
    }

    input:focus, select:focus {
        outline: none;
        border-color: #3ecf8e;
        box-shadow: 0 0 0 2px rgba(62, 207, 142, 0.1);
    }

    /* Buttons */
    .button-group {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 15px;
    }

    .btn {
        padding: 10px 15px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
    }

    .btn.primary {
        background-color: #3ecf8e;
        color: white;
    }

    .btn.secondary {
        background-color: #f0f0f0;
        color: #333;
    }

    .btn.warning {
        background-color: #f0ad4e;
        color: white;
    }

    .btn.danger {
        background-color: #d9534f;
        color: white;
    }

    .btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }

    .btn:active {
        transform: translateY(0);
    }

    /* Result boxes */
    .result-box, .status-box {
        background-color: #f9f9f9;
        border: 1px solid #eee;
        border-radius: 4px;
        padding: 15px;
        margin-top: 15px;
        overflow-x: auto;
    }

    .result-box h4 {
        margin-top: 0;
        margin-bottom: 10px;
        color: #666;
    }

    pre {
        margin: 0;
        white-space: pre-wrap;
        font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
        font-size: 0.9rem;
        line-height: 1.5;
        max-height: 300px;
        overflow-y: auto;
    }

    /* Channel list */
    .channel-list {
        margin-top: 15px;
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #eee;
        border-radius: 4px;
    }

    .channel-item {
        padding: 8px 12px;
        border-bottom: 1px solid #f0f0f0;
    }

    .channel-item:last-child {
        border-bottom: none;
    }

    /* Notes */
    .note {
        background-color: #fffbea;
        border-left: 4px solid #f0ad4e;
        padding: 10px 15px;
        margin: 15px 0;
        border-radius: 0 4px 4px 0;
    }

    .note p {
        margin: 0;
        color: #856404;
    }

    /* Code blocks */
    .code-block {
        background-color: #333;
        color: #f8f8f8;
        padding: 15px;
        border-radius: 4px;
        margin-top: 10px;
        font-size: 0.9rem;
        max-height: 250px;
        overflow-y: auto;
    }

    .code-toggle {
        background-color: #f0f0f0;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        color: #333;
    }

    .code-toggle:hover {
        background-color: #e0e0e0;
    }

    .collapsible {
        margin-bottom: 15px;
    }

    /* Benefits list */
    .benefit-list {
        padding-left: 20px;
        margin: 10px 0;
    }

    .benefit-list li {
        margin-bottom: 8px;
    }

    /* Footer */
    .footer {
        text-align: center;
        margin-top: 50px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        color: #888;
        font-size: 0.9rem;
    }

    .footer a {
        color: #3ecf8e;
        text-decoration: none;
    }

    .footer a:hover {
        text-decoration: underline;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .app-container {
            padding: 15px;
        }
        
        .form-group {
            flex-direction: column;
            align-items: stretch;
        }
        
        input, select, .btn {
            width: 100%;
        }
        
        .button-group {
            flex-direction: column;
        }
        
        .tabs ul {
            flex-wrap: wrap;
        }
        
        .tabs li {
            margin-bottom: 5px;
        }
    }
</style>