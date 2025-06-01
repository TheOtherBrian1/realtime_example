<script lang='ts'>
	// IMPORTS AND SETUP
	import { createClient } from '@supabase/supabase-js';
	import type { RealtimeChannel } from '@supabase/supabase-js';
    import {onMount} from 'svelte';
  
	// Supabase configuration
	const SUPABASE_URL = 'https://fqzymazucldrzwqbojmo.supabase.red';
	const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxenltYXp1Y2xkcnp3cWJvam1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4OTczNTcsImV4cCI6MjA2MzQ3MzM1N30.1eIupOysnsrn9bDpPf5wux9bfzYp1h4uR_r5sRczpHg';
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
	
	// ============= STATE MANAGEMENT =============
	// Authentication state
	let username = $state('tester1@testmail.com');
	let password = $state('Password123');
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
    let postgresAllChannelV2 = $state('');
    let postgresInsertsChannelV2 = $state('');
    let postgresUpdatesChannelV2 = $state('');
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
	let deletesV2 = $state('');
    let insertsV2 = $state('');
    let updatesV2 = $state('');
    let isTracked = $state('');
    let isUntracked = $state('');
    let joinState = $state('');
    let leaveState = $state('');
    let syncState = $state('');
    let generalState = $state('');
    let todosV2Values = $state('');





    // UI state
    let showCode = $state<Record<string, boolean>>({
        createChannel: false,
        listChannels: false,
        unsubscribeFromChannel: false,
        createTable: false,
        enableRLS: false,
        insertData: false,
        listenToMultipleEvents: false,
        listenToPublicChanges: false,
        listenToInsertsOnTodo: false,
        listenToUpdatesOnTodo: false,
        listenToDeletesOnTodo: false,
        listenToBroadcasts: false,
        listenToAllEventsV2: false,
        listenToInsertsV2: false,
        listenToUpdatesV2: false,
        listenToDeletesV2: false,
        sendBroadcast: false,
        triggerSetup: false,
        PolicySetupV2: false,
        TableSetupV2: false,
        trackPresence: false,
        policySetup: false,
        untrackPresence: false
    });
	
  
	// ============= AUTHENTICATION FUNCTIONS =============
	const login = async () => {
		try {
            authStatus = 'Logging in...';
			const { data, error } = await supabase.auth.signInWithPassword({
				email: username,
				password: password
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
    
    onMount(async () => {
        const { data, error } = await supabase.auth.getSession();
        if (data.session) {
            authStatus = `Logged in as ${data.session.user.email}`;
        } else {
            authStatus = 'Not logged in';
        }
    })
	
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
			allChannels = Array.from(new Set(supabase.getChannels().map(ch => ch.subTopic)));
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
        else if (allChannels.includes(channelName)) {
            console.warn('Channel already exists');
            return;
        }
		
		try {
			channel = supabase.channel(channelName);
			console.log('Channel created');
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
    const volunteerToBeTracked = (selectedChannel: string) => {
        if (!selectedChannel) {
            console.warn('No channel selected for presence tracking');
            return;
        }

        const channel = supabase.channel(selectedChannel)
        
        try {
            channel.subscribe(async (status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to presence channel');
                    const result = await channel.track({optional_custom_message: 'volunteered to be tracked. The time is: ' + new Date().toUTCString()});
                    isTracked = JSON.stringify(result);
                } else if (err) {
                    console.error('Error subscribing to presence channel:', err);
                }
            })
        } catch (error) {
            console.error('Error setting up presence tracking:', error);
            isTracked = `Exception: ${error instanceof Error ? error.message : String(error)}`;
        }
    };

    const untrack = async (selectedChannel: string) => {
        if (!selectedChannel) {
            console.warn('No channel selected for untracking');
            return;
        }

        const channel = supabase.channel(selectedChannel)
        
        try {
            const presenceUntrackStatus = await channel.untrack()
            isUntracked = JSON.stringify(presenceUntrackStatus);
        } catch (error) {
            console.error('Error leaving room:', error);
            isUntracked = `Exception: ${error instanceof Error ? error.message : String(error)}`;
        }
    };
    
	const listenToSync = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for presence sync events');
			return;
		}
		
		try {
			console.log('Listening to presence sync events on channel:', selectedChannel);
			syncState = 'Subscribing to presence sync events...';
			const channel = supabase.channel(selectedChannel)

            channel
                .on('presence', { event: 'sync' }, () => {
                    const newState = channel.presenceState()
                    console.log('Presence sync event received:', JSON.stringify(newState, null, 2));                        
                    syncState = JSON.stringify(newState, null, 2)
                })
				.subscribe(async (status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to presence sync events');
						syncState += '\nSubscribed. Waiting for sync events...';
                        const result = await channel.track({optional_custom_message: 'listening to syncs and volunteered to be tracked. The time is: ' + new Date().toUTCString()});
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
            const channel = supabase.channel(selectedChannel)

			channel
				.on(
					'presence',
					{ event: 'join' },
					(payload) => {
						console.log('Presence join event received:', payload);
                        joinState = JSON.stringify(payload, null, 2);
					}
				)
				.subscribe(async (status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to presence join events');
						joinState += '\nSubscribed. Waiting for join events...';
                        const result = await channel.track({optional_custom_message: 'listening to joins and volunteered to be tracked. The time is: ' + new Date().toUTCString()});
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
            const channel = supabase.channel(selectedChannel)

			channel
				.on(
					'presence',
					{ event: 'leave' },
					(payload) => {
						console.log('Presence leave event received:', payload);
                        leaveState = JSON.stringify(payload, null, 2);
					}
				)
				.subscribe(async (status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to presence leave events');
						leaveState += '\nSubscribed. Waiting for leave events...';
                        const result = await channel.track({optional_custom_message: 'listening to leaves and volunteered to be tracked. The time is: ' + new Date().toUTCString()});
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
                .on('presence', { event: 'join' }, () => {
                    const newState = channel.presenceState();
                    console.log('Presence state updated:', newState);
                    generalState = JSON.stringify(newState, null, 2);
                })
                .on('presence', { event: 'leave' }, () => {
                    const newState = channel.presenceState();
                    console.log('Presence state updated:', newState);
                    generalState = JSON.stringify(newState, null, 2);
                })
                .on('presence', { event: 'sync' }, () => {
                    const newState = channel.presenceState();
                    console.log('Presence state updated:', newState);
                    generalState = JSON.stringify(newState, null, 2);
                })
                .subscribe(async (status, err) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('Successfully subscribed to presence events (sync, join, leave)');
                        syncState += '\nSubscribed. Waiting for presence updates...';
                        generalState = JSON.stringify(channel.presenceState(), null, 2);
                        const result = await channel.track({'custom_message': 'listening to joins, leaves, and syncs. Volunteered to be tracked. The time is: ' + new Date().toUTCString()});
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
			console.log('Updating all todos with random value:', randomVal);
			todosValues = 'Updating todos...';
			
			const { data, error } = await supabase
				.from('todos')
				.update({ random_value: randomVal })
				.gt('random_value', -1);
			
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


	// ============= DATABASE OPERATIONS V2 =============
	const insertIntoTodosV2 = async () => {
		try {
			const randomVal = Math.floor(Math.random() * 10);
			console.log('Inserting random value into todos:', randomVal);
			todosV2Values = 'Inserting random value...';
			
			const { data, error } = await supabase
				.from('todosv2')
				.insert({ random_value: randomVal })
			
			if (error) {
				console.error('Error inserting into todos:', error);
				todosV2Values = `Error inserting: ${error.message}`;
				return;
			}
			
			console.log('Successfully inserted into todos:', data);
			await getTodosV2(); // Refresh todos list
		} catch (error) {
			console.error('Exception inserting into todos:', error);
			todosV2Values = `Exception inserting: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	const updateTodoV2 = async () => {
		try {
			const randomVal = Math.floor(Math.random() * 10);
			console.log('Updating all todos with random value:', randomVal);
			todosV2Values = 'Updating todos...';
			
			const { data, error } = await supabase
				.from('todosv2')
				.update({ random_value: randomVal })
				.gt('random_value', -1);
			
			if (error) {
				console.error('Error updating todos:', error);
				todosV2Values = `Error updating: ${error.message}`;
				return;
			}
			
			console.log('Successfully updated todos:', data);
			await getTodosV2(); // Refresh todos list
		} catch (error) {
			console.error('Exception updating todos:', error);
			todosV2Values = `Exception updating: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	const deleteTodoV2 = async () => {
		try {
			console.log('Deleting all values from todos');
			todosV2Values = 'Deleting todos...';
			
			const { data, error } = await supabase
				.from('todosv2')
				.delete()
                .gt('id', 0);
			
			if (error) {
				console.error('Error deleting from todos:', error);
				todosV2Values = `Error deleting: ${error.message}`;
				return;
			}
			
			console.log('Successfully deleted from todos:', data);
			await getTodosV2(); // Refresh todos list
		} catch (error) {
			console.error('Exception deleting from todos:', error);
			todosV2Values = `Exception deleting: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	const getTodosV2 = async () => {
		try {
			console.log('Fetching todos');
			todosV2Values = 'Loading todos...';
			
			const { data, error } = await supabase
				.from('todosv2')
				.select('*');
			
			if (error) {
				console.error('Error fetching todos:', error);
				todosV2Values = `Error fetching todos: ${error.message}`;
				return;
			}
			
			console.log('Successfully fetched todos:', data);
			todosV2Values = data.length > 0 
                ? JSON.stringify(data, null, 2)
                : 'No todos found.';
		} catch (error) {
			console.error('Exception fetching todos:', error);
			todosV2Values = `Exception fetching todos: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

	// ============= REALTIME V2 FUNCTIONS =============
	const listenToDeletesV2 = async (id: string) => {
		if (!id) {
            console.warn('No channel ID provided for DELETE V2 listener');
            return;
        }
        
		try {
			console.log('Setting up DELETE V2 listener');
			insertsV2 = 'Setting up DELETE V2 listener...';
			
			await supabase.realtime.setAuth(); // Needed for Realtime Authorization
			
			supabase
				.channel(`${id}`, {
					config: { private: true },
				})
                .on('broadcast', { event: 'DELETE' }, (payload) => {
					console.log('DELETE V2 event received:', payload);
					deletesV2 = JSON.stringify(payload, null, 2);
				})   
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to DELETE V2 events');
						deletesV2 += '\nSubscribed. Waiting for DELETE V2 events...';
					} else if (err) {
						console.error('Error subscribing to DELETE V2 events:', err);
						deletesV2 = `Error: ${err.message || 'Unknown error'}`;
					}
				});
		} catch (error) {
			console.error('Exception setting up DELETE V2 listener:', error);
			deletesV2 = `Exception: ${error instanceof Error ? error.message : String(error)}`;
		}

	};

    const listenToInsertsV2 = async (id: string) => {
		if (!id) {
            console.warn('No channel ID provided for INSERT V2 listener');
            return;
        }
        
		try {
			console.log('Setting up INSERT V2 listener');
			insertsV2 = 'Setting up INSERT V2 listener...';
			
			await supabase.realtime.setAuth(); // Needed for Realtime Authorization
			
			supabase
				.channel(`${id}`, {
					config: { private: true },
				})
                .on('broadcast', { event: 'INSERT' }, (payload) => {
					console.log('INSERT V2 event received:', payload);
					insertsV2 = JSON.stringify(payload, null, 2);
				})   
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to INSERT V2 events');
						insertsV2 += '\nSubscribed. Waiting for INSERT V2 events...';
					} else if (err) {
						console.error('Error subscribing to INSERT V2 events:', err);
						insertsV2 = `Error: ${err.message || 'Unknown error'}`;
					}
				});
		} catch (error) {
			console.error('Exception setting up INSERT V2 listener:', error);
			insertsV2 = `Exception: ${error instanceof Error ? error.message : String(error)}`;
		}

	};

    const listenToUpdatesV2 = async (id: string) => {
		if (!id) {
            console.warn('No channel ID provided for UPDATE V2 listener');
            return;
        }
        
		try {
			console.log('Setting up UPDATE V2 listener');
			updatesV2 = 'Setting up UPDATE V2 listener...';
			
			await supabase.realtime.setAuth(); // Needed for Realtime Authorization
			
			supabase
				.channel(`${id}`, {
					config: { private: true },
				})
				.on('broadcast', { event: 'UPDATE' }, (payload) => {
					console.log('UPDATE V2 event received:', payload);
					updatesV2 = JSON.stringify(payload, null, 2);
				})
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to UPDATE V2 events');
						updatesV2 += '\nSubscribed. Waiting for UPDATE V2 events...';
					} else if (err) {
						console.error('Error subscribing to UPDATE V2 events:', err);
						updatesV2 = `Error: ${err.message || 'Unknown error'}`;
					}
				});
		} catch (error) {
			console.error('Exception setting up UPDATE V2 listener:', error);
			updatesV2 = `Exception: ${error instanceof Error ? error.message : String(error)}`;
		}
	};

    const listenToAllEventsV2 = async (id: string) => {
		if (!id) {
            console.warn('No channel ID provided for ALL EVENTS V2 listener');
            return;
        }
        
		try {
			console.log('Setting up ALL EVENTS V2 listener');
			postgresAllChannelV2 = 'Setting up ALL EVENTS V2 listener...';
			
			await supabase.realtime.setAuth(); // Needed for Realtime Authorization
			
			supabase
				.channel(`${id}`, {
					config: { private: true },
				})
				.on('broadcast', { event: 'UPDATE' }, (payload) => {
					console.log('UPDATE V2 event received:', payload);
					postgresAllChannelV2 = JSON.stringify(payload, null, 2);
				})
                .on('broadcast', { event: 'INSERT' }, (payload) => {
					console.log('INSERT V2 event received:', payload);
					postgresAllChannelV2 = JSON.stringify(payload, null, 2);
				})
                .on('broadcast', { event: 'DELETE' }, (payload) => {
					console.log('DELETE V2 event received:', payload);
					postgresAllChannelV2 = JSON.stringify(payload, null, 2);
				})            
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to ALL V2 events');
						postgresAllChannelV2 += '\nSubscribed. Waiting for ALL V2 events...';
					} else if (err) {
						console.error('Error subscribing to ALL V2 events:', err);
						postgresAllChannelV2 = `Error: ${err.message || 'Unknown error'}`;
					}
				});
		} catch (error) {
			console.error('Exception setting up postgresAllChannelV2 listener:', error);
			postgresAllChannelV2 = `Exception: ${error instanceof Error ? error.message : String(error)}`;
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
    </header>

    <main class="content">
        <!-- Authentication Section -->
        <section class="card" id="authentication">
            <h2>Authentication</h2>
            <p>Useful for testing RLS access controls</p>
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

        <!-- Channel Management Section -->
        <section class="card" id="channel-management">
            <h2>Channel Management</h2>
            <p>Create and remove channels (A.K.A. topics/rooms), which act as project-specific realtime identifiers. 
                <div class="note"> <p><strong>Note:</strong> Defining a channel creates a local in-memory reference. No network request is made until the user subscribes, triggering server-side creation.</p></div>
            
            <div class="panel">
                <h3>Create Channel</h3>
                <div class="form-group">
                    <input bind:value={channelName} placeholder="New Channel Name" />
                    <button class="btn primary" onclick={createChannel}>Create Channel</button>
                </div>
                <div class="collapsible">
                    <button class="code-toggle" onclick={() => toggleCode('createChannel')}>
                        {showCode.createChannel ? 'Hide JS' : 'Show JS Example'}: Create Channel
                    </button>
                    {#if showCode.createChannel}
                        <pre class="code-block">
channel = supabase.channel(channelName);
                        </pre>
                    {/if}
                </div>
            </div>
            
            <div class="panel">
                <h3>Channel List</h3>
                <div class="collapsible">
                    <button class="code-toggle" onclick={() => toggleCode('listChannels')}>
                        {showCode.listChannels ? 'Hide JS' : 'Show JS Example'}: Get Channel List
                    </button>
                    {#if showCode.listChannels}
                        <pre class="code-block">
allChannels = supabase.getChannels().map(ch => ch.subTopic);
                        </pre>
                    {/if}
                </div>
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
                <div class="collapsible">
                    <button class="code-toggle" onclick={() => toggleCode('unsubscribeFromChannel')}>
                        {showCode.unsubscribeFromChannel ? 'Hide JS' : 'Show JS Example'}: Unsubscribe from Channel
                    </button>
                    {#if showCode.unsubscribeFromChannel}
                        <pre class="code-block">
supabase.removeChannel('channel_name');
                        </pre>
                    {/if}
                </div>
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



        <!-- Postgres Changes Section -->
        <section class="card" id="postgres-changes">
            <h2>Standard Postgres Changes</h2>
            <div class="panel">
                <h3>Table Setup Instructions</h3>
                <div class="collapsible">
                    <button class="code-toggle" onclick={() => toggleCode('createTable')}>
                        {showCode.createTable ? 'Hide SQL' : 'Show SQL'}: Create Example Table
                    </button>
                    {#if showCode.createTable}
                        <pre class="code-block">
create table if not exists public.todos (
    id bigint GENERATED ALWAYS AS IDENTITY,
    random_value int null,
    constraint todos_pkey primary key (id)
);
                        </pre>
                        <div class="note">
                            <p>Enable Realtime publication on the table in <a href='https://supabase.com/dashboard/project/_/editor'>Table Editor</a></p>
                            <img src='https://i.ibb.co/Q7sMvkC3/Screenshot-2025-04-05-at-8-39-23-PM.png' alt='realtime enable button' />
                        </div>
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
                <div class="note"> <p><strong>Note:</strong> RLS does not work on DELETE. This is a limitation for Standard Postgres Changes</p></div>
            </div>

            <div class="panel">
                <h3>Todos Operations (changed with PostgREST)</h3>
                <div class="button-group">
                    <button class="btn primary" onclick={getTodos}>Get Todos</button>
                    <button class="btn secondary" onclick={insertIntoTodos}>Insert Random Value</button>
                    <button title='updates all todos' class="btn warning" onclick={updateTodo}>Update All Todos</button>
                    <button class="btn danger" onclick={deleteTodo}>Delete All Todos</button>
                </div>
                
                <div class="result-box">
                    <h4>Results:</h4>
                    <pre class='postgrest'>{todosValues}</pre>
                </div>
            </div>
            <div class="note">
                <p>
                    <strong>Note:</strong> If you want to subscribe to multiple events, you will have to chain them together with the .on keyword. Subscribing to one example will override the subscription to another if they use the same channel.
                </p>
                <div class='panel'>
                    <button class="btn code-toggle" onclick={() => toggleCode('listenToMultipleEvents')}>
                        {showCode.listenToMultipleEvents ? 'Hide JS' : 'Show JS Example'}: Show multiple .on subscriptions
                    </button>
                    {#if showCode.listenToMultipleEvents}
                        <pre class="code-block">
supabase
.channel(selectedChannel)
.on(
    'postgres_changes',
    &#123;
        event: 'INSERT',
        schema: 'public',
        table: 'todos',
    &#125;,
    (payload) => &#123;
        console.log('INSERT event received:', payload);
    &#125;
&#125;)
.on(
    'postgres_changes',
    &#123;
        event: 'UPDATE',
        schema: 'public',
        table: 'todos',
    &#125;,
    (payload) => &#123;
        console.log('UPDATE event received:', payload);
    &#125;
&#125;)
.subscribe((status, err) &#123;
    if (status === 'SUBSCRIBED') &#123;
        console.log('Successfully subscribed to INSERT and UPDATE events');
    &#125; else if (err) &#123;
        console.error('Error subscribing to INSERT and UPDATE events:', err);
    &#125;
&#125;);
                        </pre>
                    {/if}
                </div>
            </div>
            

            <div class="panel">
                <h3>Listen to All Published Changes in Public Schema</h3>
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
                    <button class="btn code-toggle" onclick={() => toggleCode('listenToPublicChanges')}>
                        {showCode.listenToPublicChanges ? 'Hide JS' : 'Show JS Example'}: Listen to All Changes
                    </button>
                    {#if showCode.listenToPublicChanges}
                        <pre class="code-block">
supabase
.channel(selectedChannel)
.on(
    'postgres_changes',
    &#123;
        event: '*',
        schema: 'public',
    &#125;,
    (payload) => &#123;
        console.log('Postgres public change received:', payload);
    &#125;
)
.subscribe((status, err) => &#123;
    if (status === 'SUBSCRIBED') &#123;	
        console.log('Successfully subscribed to public changes');
    &#125; else if (err) &#123;	
        console.error('Error subscribing to public changes:', err);
    &#125;	
&#125;);
                        </pre>
                    {/if}
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
                    <button class="btn code-toggle" onclick={() => toggleCode('listenToInsertsOnTodo')}>
                        {showCode.listenToInsertsOnTodo ? 'Hide JS' : 'Show JS Example'}: Listen to INSERTs
                    </button>
                    {#if showCode.listenToInsertsOnTodo}
                        <pre class="code-block">
supabase
.channel(selectedChannel)
.on(
    'postgres_changes',
    &#123;
        event: 'INSERT',
        schema: 'public',
        table: 'todos',
    &#125;,
    (payload) => &#123;
        console.log('INSERT event received:', payload);
    &#125;
&#125;)
.subscribe((status, err) &#123;
    if (status === 'SUBSCRIBED') &#123;
        console.log('Successfully subscribed to INSERT events');
    &#125; else if (err) &#123;
        console.error('Error subscribing to INSERT events:', err);
    &#125;
&#125;);
                        </pre>
                    {/if}
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
                    <button class="btn code-toggle" onclick={() => toggleCode('listenToUpdatesOnTodo')}>
                        {showCode.listenToUpdatesOnTodo ? 'Hide JS' : 'Show JS Example'}: Listen to Updates
                    </button>
                    {#if showCode.listenToUpdatesOnTodo}
                        <pre class="code-block">
supabase
.channel(selectedChannel)
.on(
    'postgres_changes',
    &#123;
        event: 'UPDATE',
        schema: 'public',
        table: 'todos',
    &#125;,
    (payload) => &#123;
        console.log('Update event received:', payload);
    &#125;
&#125;)
.subscribe((status, err) &#123;
    if (status === 'SUBSCRIBED') &#123;
        console.log('Successfully subscribed to UPDATE events');
    &#125; else if (err) &#123;
        console.error('Error subscribing to UPDATE events:', err);
    &#125;
&#125;);
                        </pre>
                    {/if}
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
                    <button class="btn code-toggle" onclick={() => toggleCode('listenToDeletesOnTodo')}>
                        {showCode.listenToDeletesOnTodo ? 'Hide JS' : 'Show JS Example'}: Listen to Deletes
                    </button>
                    {#if showCode.listenToDeletesOnTodo}
                        <pre class="code-block">
                            supabase
                            .channel(selectedChannel)
                            .on(
                                'postgres_changes',
                                &#123;
                                    event: 'DELETE',
                                    schema: 'public',
                                    table: 'todos',
                                &#125;,
                                (payload) &#123;
                                    console.log('Delete event received:', payload);
                                &#125;
                            &#125;)
                            .subscribe((status, err) &#123;
                                if (status === 'SUBSCRIBED') &#123;
                                    console.log('Successfully subscribed to DELETE events');
                                &#125; else if (err) &#123;
                                    console.error('Error subscribing to DELETE events:', err);
                                &#125;
                            &#125;);
                        </pre>
                    {/if}
                </div>
                <div class="result-box">
                    <pre>{postgresDeletes}</pre>
                </div>
            </div>
        </section>

        <!-- Postgres Changes V2 Section -->
        <section class="card" id="postgres-v2">
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
                


                <!-- Duck---------------------------------------------------- -->
                <div class="collapsible">
                    <button class="code-toggle" onclick={() => toggleCode('TableSetupV2')}>
                        {showCode.TableSetupV2 ? 'Hide SQL' : 'Show SQL'}: Create a todosV2 table
                    </button>
                    {#if showCode.TableSetupV2}
                        <pre class="code-block">
CREATE TABLE public.todosV2 (
id SERIAL PRIMARY KEY,
random_value FLOAT DEFAULT random(),
created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
message TEXT
);
                        </pre>
                        <div class="note">
                            <p>Enable Realtime publication on the table in <a href='https://supabase.com/dashboard/project/_/editor'>Table Editor</a></p>
                            <img src='https://i.ibb.co/Q7sMvkC3/Screenshot-2025-04-05-at-8-39-23-PM.png' alt='realtime enable button' />
                        </div>
                    {/if}
                </div>

                <div class="collapsible">
                    <button class="code-toggle" onclick={() => toggleCode('PolicySetupV2')}>
                        {showCode.PolicySetupV2 ? 'Hide SQL' : 'Show SQL'}: Create a policy for todosV2 table
                    </button>
                    {#if showCode.PolicySetupV2}
                        <pre class="code-block">
ALTER TABLE todosV2 ENABLE ROW LEVEL SECURITY;

create policy "Authenticated users can receive broadcasts on todosV2"
on "public".todosV2
for all
to authenticated
using ( true );
                        </pre>
                    {/if}
                </div>
                
                <div class="collapsible">
                    <button class="code-toggle" onclick={() => toggleCode('triggerSetup')}>
                        {showCode.triggerSetup ? 'Hide SQL' : 'Show SQL'}: Set up Trigger on Target Table
                    </button>
                    {#if showCode.triggerSetup}
                        <pre class="code-block">
create or replace function public.todosV2_changes()
returns trigger
as $$
begin
perform realtime.broadcast_changes(
-- ROOM:----------------------------
-- In this example the room is hardcoded
'realtime_test'::TEXT,   -- topic/room


-- PAYLOAD:----------------------------
-- tg_... are keywords provided by the DB

tg_op,                      -- returns what kind of event: INSERT, UPDATE, DELETE
tg_op,                      -- returns operations: INSERT, UPDATE, DELETE
tg_table_name,              -- returns table name: todosV2
tg_table_schema,            -- returns schema: public
new,                        -- returns new record: applies to UPDATE and INSERT
old                        -- returns old record: applies to UPDATE and DELETE

);
return null;
end;
$$ language plpgsql;

-- Create trigger
create trigger broadcast_changes_for_todosV2_trigger
after insert or update or delete
on public.todosV2
for each row
execute function todosV2_changes();
                        </pre>
                    {/if}
                </div>

                <div class="collapsible">
                    <button class="code-toggle" onclick={() => toggleCode('policySetup')}>
                        {showCode.policySetup ? 'Hide SQL' : 'Show SQL'}: Set up Policy on Realtime Messages
                    </button>
                    {#if showCode.policySetup}
                        <pre class="code-block">
create policy "authenticated can send broadcast and presence on topic"
on "realtime"."messages"
for all
to authenticated
USING (
(select realtime.topic()) = 'realtime_test'
and 
realtime.messages.extension in ('broadcast', 'presence')
);
                        </pre>
                    {/if}
                </div>
            </div>
            <div class="note"> 
                <p><strong>Note:</strong> 
                    In this example, the RLS (Row-Level Security) policy on the realtime.messages table is set to "realtime_test". <strong>If you try to use a different room for this exercise, you'll run into an authentication error.</strong>

Similarly, the trigger is also configured to use "realtime_test". So even if you remove the RLS policy, the trigger will still only send messages to the "realtime_test" channel.
                    <br /><br />
If you want to listen to a different channel, you'll need to manually update both the trigger and the RLS policy to reflect the new channel name.
                </p>
            </div>
            <div class="note"> 
                <p><strong>Note:</strong> 
                    Auth is established during the subscription process. If you update the RLS policy after the subscription is made, you'll have to refresh the subscription or refresh the page.
                </p>
            </div>

            
            <h3>TodosV2 Operations (changed with PostgREST)</h3>
            <div class="button-group">
                <button class="btn primary" onclick={getTodosV2}>Get todosV2</button>
                <button class="btn secondary" onclick={insertIntoTodosV2}>Insert Random Value</button>
                <button title='updates all todosV2' class="btn warning" onclick={updateTodoV2}>Update All todosV2</button>
                <button class="btn danger" onclick={deleteTodoV2}>Delete All todosV2</button>
            </div>
            
            <div class="result-box">
                <h4>Results:</h4>
                <pre class='postgrest'>{todosV2Values}</pre>
            </div>



            <div class="panel">
                <h3>Listen to ALL V2 Events on todosV2</h3>
                <div class="form-group">
                    <select bind:value={postgresAllChannelV2} onfocus={() => listAllChannels()}>
                        <option value={null}>Select a channel</option>
                        {#each allChannels as ch}
                            <option value={ch}>{ch}</option>
                        {/each}
                    </select>
                    <button class="btn primary" onclick={() => listenToAllEventsV2(postgresAllChannelV2)}>
                        Listen to All Events V2
                    </button>
                    <button class="btn code-toggle" onclick={() => toggleCode('listenToAllEventsV2')}>
                        {showCode.listenToAllEventsV2 ? 'Hide JS' : 'Show JS Example'}: Listen to Broadcasts
                    </button>
                    {#if showCode.listenToAllEventsV2}
                        <pre class="code-block">

const listenToAllEventsV2 = async (id: string) => &#123;
if (!id) &#123;
console.warn('No channel ID provided for ALL EVENTS V2 listener');
return;
&#125;

try &#123;
console.log('Setting up ALL EVENTS V2 listener');
postgresAllChannelV2 = 'Setting up ALL EVENTS V2 listener...';

await supabase.realtime.setAuth(); // Needed for Realtime Authorization

supabase
    .channel(`$&#123;id&#125;`, &#123;
        config: &#123; private: true &#125;,
    &#125;)
    .on('broadcast', &#123; event: 'UPDATE' &#125;, (payload) => &#123;
        console.log('UPDATE V2 event received:', payload);
        postgresAllChannelV2 = JSON.stringify(payload, null, 2);
    &#125;)
    .on('broadcast', &#123; event: 'INSERT' &#125;, (payload) => &#123;
        console.log('INSERT V2 event received:', payload);
        postgresAllChannelV2 = JSON.stringify(payload, null, 2);
    &#125;)
    .on('broadcast', &#123; event: 'DELETE' &#125;, (payload) => &#123;
        console.log('DELETE V2 event received:', payload);
        postgresAllChannelV2 = JSON.stringify(payload, null, 2);
    &#125;)            
    .subscribe((status, err) => &#123;
        if (status === 'SUBSCRIBED') &#123;
            console.log('Successfully subscribed to ALL V2 events');
            postgresAllChannelV2 += '\nSubscribed. Waiting for ALL V2 events...';
        &#125; else if (err) &#123;
            console.error('Error subscribing to ALL V2 events:', err);
            postgresAllChannelV2 = `Error: $&#123;err.message || 'Unknown error'&#125;`;
        &#125;
    &#125;);
&#125; catch (error) &#123;
console.error('Exception setting up postgresAllChannelV2 listener:', error);
postgresAllChannelV2 = `Exception: $&#123;error instanceof Error ? error.message : String(error)}`;
&#125;
&#125;;
                        </pre>
                    {/if}
                
                </div>
                <div class="result-box">
                    <pre>{postgresAllChannelV2}</pre>
                </div>
            </div>










            <!-- INSERTS V2 -->
            <div class="panel">
                <h3>Listen to INSERT V2 Events</h3>
                <div class="form-group">
                    <select bind:value={postgresInsertsChannelV2} onfocus={() => listAllChannels()}>
                        <option value={null}>Select a channel</option>
                        {#each allChannels as ch}
                            <option value={ch}>{ch}</option>
                        {/each}
                    </select>
                    <button class="btn primary" onclick={() => listenToInsertsV2(postgresInsertsChannelV2)}>
                        Listen to Inserts V2
                    </button>
                    <button class="btn code-toggle" onclick={() => toggleCode('listenToInsertsV2')}>
                        {showCode.listenToInsertsV2 ? 'Hide JS' : 'Show JS Example'}: Listen to Inserts V2
                    </button>
                    {#if showCode.listenToInsertsV2}
                        <pre class="code-block">

const listenToInsertsV2 = async (id: string) => &#123;
if (!id) &#123;
console.warn('No channel ID provided for INSERT V2 listener');
return;
&#125;

try &#123;
console.log('Setting up INSERT V2 listener');
insertsV2 = 'Setting up INSERT V2 listener...';

await supabase.realtime.setAuth(); // Needed for Realtime Authorization

supabase
    .channel(`$&#123;id&#125;`, &#123;
        config: &#123; private: true &#125;,
    &#125;)
    .on('broadcast', &#123; event: 'INSERT' &#125;, (payload) => &#123;
        console.log('INSERT V2 event received:', payload);
        insertsV2 = JSON.stringify(payload, null, 2);
    &#125;)           
    .subscribe((status, err) => &#123;
        if (status === 'SUBSCRIBED') &#123;
            console.log('Successfully subscribed to INSERT V2 events');
            insertsV2 += '\nSubscribed. Waiting for INSERT V2 events...';
        &#125; else if (err) &#123;
            console.error('Error subscribing to INSERT V2 events:', err);
            insertsV2 = `Error: $&#123;err.message || 'Unknown error'&#125;`;
        &#125;
    &#125;);
&#125; catch (error) &#123;
console.error('Exception setting up INSERT V2 listener:', error);
deletesV2 = `Exception: $&#123;error instanceof Error ? error.message : String(error)}`;
&#125;
&#125;;
                        </pre>
                    {/if}
                </div>
                <div class="result-box">
                    <pre>{insertsV2}</pre>
                </div>
            </div>

            <!-- UPDATES V2 -->
            <div class="panel">
                <h3>Listen to UPDATE V2 Events</h3>
                <div class="form-group">
                    <select bind:value={postgresUpdatesChannelV2} onfocus={() => listAllChannels()}>
                        <option value={null}>Select a channel</option>
                        {#each allChannels as ch}
                            <option value={ch}>{ch}</option>
                        {/each}
                    </select>
                    <button class="btn primary" onclick={() => listenToUpdatesV2(postgresUpdatesChannelV2)}>
                        Listen to Updates V2
                    </button>
                    <button class="btn code-toggle" onclick={() => toggleCode('listenToUpdatesV2')}>
                        {showCode.listenToUpdatesV2 ? 'Hide JS' : 'Show JS Example'}: Listen to Updates V2
                    </button>
                    {#if showCode.listenToUpdatesV2}
                        <pre class="code-block">

const listenToUpdatesV2 = async (id: string) => &#123;
if (!id) &#123;
console.warn('No channel ID provided for ALL EVENTS V2 listener');
return;
&#125;

try &#123;
console.log('Setting up UPDATE V2 listener');
updatesV2 = 'Setting up UPDATE V2 listener...';

await supabase.realtime.setAuth(); // Needed for Realtime Authorization

supabase
    .channel(`$&#123;id&#125;`, &#123;
        config: &#123; private: true &#125;,
    &#125;)
    .on('broadcast', &#123; event: 'UPDATE' &#125;, (payload) => &#123;
        console.log('UPDATE V2 event received:', payload);
        updatesV2 = JSON.stringify(payload, null, 2);
    &#125;)           
    .subscribe((status, err) => &#123;
        if (status === 'SUBSCRIBED') &#123;
            console.log('Successfully subscribed to UPDATE V2 events');
            updatesV2 += '\nSubscribed. Waiting for UPDATE V2 events...';
        &#125; else if (err) &#123;
            console.error('Error subscribing to UPDATE V2 events:', err);
            updatesV2 = `Error: $&#123;err.message || 'Unknown error'&#125;`;
        &#125;
    &#125;);
&#125; catch (error) &#123;
console.error('Exception setting up UPDATE V2 listener:', error);
updatesV2 = `Exception: $&#123;error instanceof Error ? error.message : String(error)}`;
&#125;
&#125;;
                        </pre>
                    {/if}
                </div>
                <div class="result-box">
                    <pre>{updatesV2}</pre>
                </div>
            </div>

            <!-- DELETES V2 -->
            <div class="panel">
                <h3>Listen to DELETE V2 Events</h3>
                <div class="form-group">
                    <select bind:value={postgresDeletesChannelV2} onfocus={() => listAllChannels()}>
                        <option value={null}>Select a channel</option>
                        {#each allChannels as ch}
                            <option value={ch}>{ch}</option>
                        {/each}
                    </select>
                    <button class="btn primary" onclick={() => listenToDeletesV2(postgresDeletesChannelV2)}>
                        Listen to Deletes V2
                    </button>
                    <button class="btn code-toggle" onclick={() => toggleCode('listenToDeletesV2')}>
                        {showCode.listenToDeletesV2 ? 'Hide JS' : 'Show JS Example'}: Listen to Deletes V2
                    </button>
                    {#if showCode.listenToDeletesV2}
                        <pre class="code-block">

const listenToDeletesV2 = async (id: string) => &#123;
if (!id) &#123;
console.warn('No channel ID provided for DELETE V2 listener');
return;
&#125;

try &#123;
console.log('Setting up DELETE V2 listener');
deletesV2 = 'Setting up DELETE V2 listener...';

await supabase.realtime.setAuth(); // Needed for Realtime Authorization

supabase
    .channel(`$&#123;id&#125;`, &#123;
        config: &#123; private: true &#125;,
    &#125;)
    .on('broadcast', &#123; event: 'DELETE' &#125;, (payload) => &#123;
        console.log('DELETE V2 event received:', payload);
        deletesV2 = JSON.stringify(payload, null, 2);
    &#125;)           
    .subscribe((status, err) => &#123;
        if (status === 'SUBSCRIBED') &#123;
            console.log('Successfully subscribed to DELETE V2 events');
            deletesV2 += '\nSubscribed. Waiting for DELETE V2 events...';
        &#125; else if (err) &#123;
            console.error('Error subscribing to DELETE V2 events:', err);
            deletesV2 = `Error: $&#123;err.message || 'Unknown error'&#125;`;
        &#125;
    &#125;);
&#125; catch (error) &#123;
console.error('Exception setting up DELETE V2 listener:', error);
deletesV2 = `Exception: $&#123;error instanceof Error ? error.message : String(error)}`;
&#125;
&#125;;
                        </pre>
                    {/if}
                </div>
                <div class="result-box">
                    <pre>{deletesV2}</pre>
                </div>
            </div>



        </section>
        <!-- Broadcasts Section -->
        <section class="card" id="broadcasts">
            <h2>Broadcasts</h2>
            <div class="note">
                <p><strong>Note:</strong> 
                    These examples were not defined with the setting "config: &#123; private: true &#125;". So, they ignore <a href='https://supabase.com/docs/guides/realtime/authorization?queryGroups=language&language=js'>RLS-restrictions/realtime-auth configs</a>.
                </p>
            </div>
            
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
                    <button class="btn code-toggle" onclick={() => toggleCode('listenToBroadcasts')}>
                        {showCode.listenToBroadcasts ? 'Hide JS' : 'Show JS Example'}: Listen to Broadcasts
                    </button>
                    {#if showCode.listenToBroadcasts}
                        <pre class="code-block">
try &#123;    
    supabase
        .channel(selectedChannel)
        .send(&#123;
            type: 'broadcast',
            event: 'shout',
            payload: &#123; message &#125;
        &#125;)
        .then(() &#123;
            console.log('Broadcast sent successfully');
            broadcastMessage = ''; // Clear input after sending
        &#125;)
        .catch((err) &#123;
            console.error('Error sending broadcast:', err);
            alert(`Error sending broadcast: $&#123;err.message || 'Unknown error'&#125;`);
        &#125;);
&#125; catch (error) &#123;
    console.error('Exception sending broadcast:', error);
    alert(`Exception sending broadcast: $&#123;error instanceof Error ? error.message : String(error)&#125;`);
&#125;
                        </pre>
                    {/if}
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
                    <button class="btn code-toggle" onclick={() => toggleCode('sendBroadcast')}>
                        {showCode.sendBroadcast ? 'Hide JS' : 'Show JS Example'}: Send Broadcast
                    </button>
                    {#if showCode.sendBroadcast}
                        <pre class="code-block">
try &#123;
    console.log('Listening to broadcast events on channel:', selectedChannel);
    broadcastMessageReceived = 'Subscribing to broadcast events...';
    
    supabase
        .channel(selectedChannel)
        .on(
            'broadcast',
            &#123; event: 'shout' &#125;,
            (payload) => &#123;
                console.log('Broadcast received:', payload);
                broadcastMessageReceived = JSON.stringify(payload, null, 2);
            &#125;
        &#125;)
        .subscribe((status, err) &#123;
            if (status === 'SUBSCRIBED') &#123;
                console.log('Successfully subscribed to broadcast events');
                broadcastMessageReceived += '\nSubscribed. Waiting for broadcasts...';
            &#125; else if (err) &#123;
                console.error('Error subscribing to broadcast events:', err);
                broadcastMessageReceived = `Error: $&#123;err.message || 'Unknown error'&#125;`;
            &#125;
        &#125;);
&#125; catch (error) &#123;
    console.error('Error setting up broadcast listener:', error);
    broadcastMessageReceived = `Exception: $&#123;error instanceof Error ? error.message : String(error)&#125;`;
&#125;
                        </pre>
                    {/if}
                </div>
            </div>
        </section>

        <!-- Presence Section -->
        <section class="card" id="presence">
            <h2>Presence Functions</h2>
            <div class="note">
                <p><strong>Note:</strong> 
                    These examples were not defined with the setting "config: &#123; private: true &#125;". So, they ignore <a href='https://supabase.com/docs/guides/realtime/authorization?queryGroups=language&language=js'>RLS-restrictions/realtime-auth configs</a>.
                </p>
            </div>

            


            <div class="panel">
                <h3>No longer be tracked</h3>


                <button class="btn code-toggle" onclick={() => toggleCode('untrackPresence')}>
                    {showCode.untrackPresence ? 'Hide JS' : 'Show JS Example'}: Stop tracking your presence state
                </button>
                {#if showCode.untrackPresence}
                    <pre class="code-block">

const untrack = async (selectedChannel: string) => &#123;
    if (!selectedChannel) &#123;
        console.warn('No channel selected for untracking');
        return;
    &#125;

    const channel = supabase.channel(selectedChannel)
    
    try &#123;
        const presenceUntrackStatus = await channel.untrack()
        isUntracked = JSON.stringify(presenceUntrackStatus);
    &#125; catch (error) &#123;
        console.error('Error leaving room:', error);
        isUntracked = `Exception: $&#123;error instanceof Error ? error.message : String(error)&#125;`;
    &#125;
&#125;
                    </pre>
                {/if}


                <div class="form-group">
                    <select bind:value={presenceChannel} onfocus={() => listAllChannels()}>
                        <option value={null}>Select a channel</option>
                        {#each allChannels as ch}
                            <option value={ch}>{ch}</option>
                        {/each}
                    </select>
                    <button class="btn primary" onclick={() => untrack(presenceChannel)}>
                        No longer be tracked
                    </button>
                </div>
                <div class="result-box">
                    <pre>{isUntracked}</pre>
                </div>
            </div>


            <div class="panel">
                <h3>Volunteer to be tracked (Users must call .track() to send out join, sync, or leave events), but do not listen</h3>


                <button class="btn code-toggle" onclick={() => toggleCode('trackPresence')}>
                    {showCode.trackPresence ? 'Hide JS' : 'Show JS Example'}: Subscribe to room and let others track your presence state
                </button>
                {#if showCode.trackPresence}
                    <pre class="code-block">

const room = supabase.channel('room-name')
await room.subscribe(async (status, err) => &#123;
    if (status === 'SUBSCRIBED') &#123;
        console.log('Successfully subscribed to channel');
        // can call the track function in a callback after the channel is subscribed
        const presenceTrackStatus = await room.track(&#123;optional_custom_message: 'some_value'&#125;)
        console.log(presenceTrackStatus)
    &#125;
    &#123; else if (err) &#123;
        console.error('Error subscribing to channel:', err);
    &#125;
&#125;)

// alternatively, if they are already subscribed to a room, they can volunteer to be tracked after the fact:
// const presenceTrackStatus = await room.track(&#123;optional_custom_message: 'some_value'&#125;) 

                    </pre>
                {/if}


                <div class="form-group">
                    <select bind:value={presenceChannel} onfocus={() => listAllChannels()}>
                        <option value={null}>Select a channel</option>
                        {#each allChannels as ch}
                            <option value={ch}>{ch}</option>
                        {/each}
                    </select>
                    <button class="btn primary" onclick={() => volunteerToBeTracked(presenceChannel)}>
                        Volunteer to be tracked
                    </button>
                </div>
                <div class="result-box">
                    <pre>{isTracked}</pre>
                </div>
            </div>


















            <div class="panel">
                <h3>Full Presence Tracking</h3>
                <p>Subscribe to a room, volunteer to be tracked, and listen to all presence events</p>
                <button class="btn code-toggle" onclick={() => toggleCode('trackPresence')}>
                    {showCode.trackPresence ? 'Hide JS' : 'Show JS Example'}: Subscribe to room and listen to all presence events
                </button>
                {#if showCode.trackPresence}
                    <pre class="code-block">
try &#123;
    console.log('Setting up presence listener for room:', room);
    syncState = 'Setting up presence listener...';
    
    const channel = supabase.channel(room);
    channel
        .on('presence', &#123; event: 'join' &#125;, () => &#123;
            const newState = channel.presenceState();
            console.log('Presence state updated:', newState);
            generalState = JSON.stringify(newState, null, 2);
        &#125;)
        .on('presence', &#123; event: 'leave' &#125;, () => &#123;
            const newState = channel.presenceState();
            console.log('Presence state updated:', newState);
            generalState = JSON.stringify(newState, null, 2);
        &#125;)
        .on('presence', &#123; event: 'sync' &#125;, () => &#123;
            const newState = channel.presenceState();
            console.log('Presence state updated:', newState);
            generalState = JSON.stringify(newState, null, 2);
        &#125;)
        .subscribe(async (status, err) &#123;
            if (status === 'SUBSCRIBED') &#123;
                console.log('Successfully subscribed to presence events');
                syncState += '\nSubscribed. Waiting for presence updates...';
                generalState = JSON.stringify(channel.presenceState(), null, 2);
                const result = await channel.track(&#123; 'custom_message': '12345' &#125;);
            &#125; else if (err) &#123;
                console.error('Error subscribing to presence events:', err);
                syncState = `Error: $&#123;err.message || 'Unknown error'&#125;`;
            &#125;
        &#125;);
    
&#125; catch (error) &#123;
    console.error('Error setting up presence listener:', error);
    syncState = `Exception: $&#123;error instanceof Error ? error.message : String(error)}`;
&#125;
                    </pre>
                {/if}
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
                    <pre>{generalState}</pre>
                </div>
            </div>

            <div class="panel">
                <h3>Listen to Join Events</h3>
                <p>Subscribe to room, listen to join events, and volunteer to be tracked</p>
                <button class="btn code-toggle" onclick={() => toggleCode('listenToJoin')}>
                    {showCode.listenToJoin ? 'Hide JS' : 'Show JS Example'}: Listen to join events and volunteer to be tracked
                </button>
                {#if showCode.listenToJoin}
                    <pre class="code-block">
const channel = supabase.channel(room);
channel(selectedChannel)
.on(
    'presence',
    &#123; event: 'join' &#125;,
    (payload) => &#123;
        console.log('Presence join event received:', payload);
        joinState = JSON.stringify(payload, null, 2);
    &#125;
)
.subscribe(async (status, err) &#123;
    if (status === 'SUBSCRIBED') &#123;
        console.log('Successfully subscribed to presence join events');
        joinState += '\nSubscribed. Waiting for join events...';
        const result = await channel.track(&#123;optional_custom_message: 'some_value'&#125;);
    &#125; else if (err) &#123;
        console.error('Error subscribing to presence join events:', err);
        joinState = `Error: $&#123;err.message || 'Unknown error'&#125;`;
    &#125;
&#125;);
                    </pre>
                {/if}


                <div class="form-group">
                    <select bind:value={presenceChannel} onfocus={() => listAllChannels()}>
                        <option value={null}>Select a channel</option>
                        {#each allChannels as ch}
                            <option value={ch}>{ch}</option>
                        {/each}
                    </select>
                    <button class="btn primary" onclick={() => listenToJoin(presenceChannel)}>
                        Listen to Joins
                    </button>
                </div>
                <div class="result-box">
                    <pre>{joinState}</pre>
                </div>
            </div>

            <div class="panel">
                <h3>Listen to Leave Events</h3>
                <p>Subscribe to room, volunteer to be tracked, and get notified when users leave the room</p>
                <button class="btn code-toggle" onclick={() => toggleCode('listenToLeave')}>
                    {showCode.listenToLeave ? 'Hide JS' : 'Show JS Example'}: Listen to Leave Events
                </button>
                {#if showCode.listenToLeave}
                    <pre class="code-block">
try &#123;
    console.log('Listening to presence leave events on channel:', selectedChannel);
    syncState = 'Subscribing to leave events...';
    const channel = supabase.channel(room);

    channel
        .on(
            'presence',
            &#123; event: 'leave' &#125;, (payload) => &#123;
                console.log('Presence sync event received:', payload);
                syncState = JSON.stringify(payload, null, 2);
            &#125;
        )
        .subscribe(async (status, err) &#123;
            if (status === 'SUBSCRIBED') &#123;
                console.log('Successfully subscribed to presence sync events');
                syncState += '\nSubscribed. Waiting for sync events...';
                const result = await channel.track(&#123;optional_custom_message: 'some_value'&#125;);
            &#125; else if (err) &#123;
                console.error('Error subscribing to presence sync events:', err);
                syncState = `Error: $&#123;err.message || 'Unknown error'&#125;`;
            &#125;
        &#125;);
&#125; catch (error) &#123;
    console.error('Error setting up presence sync listener:', error);
    syncState = `Exception: $&#123;error instanceof Error ? error.message : String(error)&#125;`;
&#125;);
                    </pre>
                {/if}
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
                <p>Subscribe to room, volunteer to be tracked, and get notified as anyone joins and leaves</p>
                <button class="btn code-toggle" onclick={() => toggleCode('listenToSync')}>
                    {showCode.listenToSync ? 'Hide JS' : 'Show JS Example'}: Listen to Sync Events
                </button>
                {#if showCode.listenToSync}
                    <pre class="code-block">
try &#123;
    console.log('Listening to presence sync events on channel:', selectedChannel);
    syncState = 'Subscribing to presence sync events...';
    
    const channel = supabase.channel(room);
    
    channel
        .on(
            'presence',
            &#123; event: 'sync' &#125;, (payload) => &#123;
                console.log('Presence sync event received:', payload);
                syncState = JSON.stringify(payload, null, 2);
            &#125;
        )
        .subscribe(async (status, err) &#123;
            if (status === 'SUBSCRIBED') &#123;
                console.log('Successfully subscribed to presence sync events');
                syncState += '\nSubscribed. Waiting for sync events...';
                const result = await channel.track(&#123;optional_custom_message: 'some_value'&#125;);
            &#125; else if (err) &#123;
                console.error('Error subscribing to presence sync events:', err);
                syncState = `Error: $&#123;err.message || 'Unknown error'&#125;`;
            &#125;
        &#125;);
&#125; catch (error) &#123;
    console.error('Error setting up presence sync listener:', error);
    syncState = `Exception: $&#123;error instanceof Error ? error.message : String(error)&#125;`;
&#125;);
                    </pre>
                {/if}
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
        </section>

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

    /* Card */
    .card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        padding: 20px;
        margin-bottom: 30px;
        scroll-margin-top: 20px;
    }

    .card h2 {
        color: #333;
        margin-top: 0;
        padding-bottom: 0px;
        margin-bottom: 0px;
        border-bottom: 1px solid #f0f0f0;
        position: sticky;
        top: 0;
        background: white;
        z-index: 1;
        padding-top: 10px;
    }
    .card p {
        margin-top: 0;
        margin-bottom: 30px;
        font-size:16px;
        color: #292929;
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
    pre, .postgrest {
        height: 250px;
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
    }

    /* Smooth scrolling for section navigation */
    html {
        scroll-behavior: smooth;
    }

    /* Add space at the bottom of the page for better scrolling experience */
    body {
        padding-bottom: 100px;
    }
</style>
