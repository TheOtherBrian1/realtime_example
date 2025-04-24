<script lang='ts'>
	// IMPORTS AND SETUP
	import { createClient } from '@supabase/supabase-js';
	import type { RealtimeChannel } from '@supabase/supabase-js';
  
	// Supabase configuration
	const SUPABASE_URL = 'https://etatllfntoohgjpkimws.supabase.co';
	const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0YXRsbGZudG9vaGdqcGtpbXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MDAzMTQsImV4cCI6MjA1OTE3NjMxNH0.gEjSVfseiLuoMzi_YQA8wCmCWiynmmhhLa8JWAeOnYo';
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
	
	// STATE MANAGEMENT
	// Authentication state
	let username = $state('');
	let password = $state('');
	
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
	
	$inspect(allChannels);
  
	// AUTHENTICATION FUNCTIONS
	const login = async () => {
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email: username || 'brian@supabase.io',
				password: password || 'Password123'
			});
			
			if (error) {
				console.error('Login error:', error.message);
				return;
			}
			
			console.log('Successfully logged in:', data);
		} catch (err) {
			console.error('Login exception:', err);
		}
	};
	
	const signout = async () => {
		try {
			const { error } = await supabase.auth.signOut();
			
			if (error) {
				console.error('Sign out error:', error.message);
				return;
			}
			
			console.log('Successfully signed out');
		} catch (err) {
			console.error('Sign out exception:', err);
		}
	};
  
	// CHANNEL MANAGEMENT FUNCTIONS
	const listAllChannels = () => {
		try {
			allChannels = supabase.getChannels().map(ch => ch.subTopic);
			console.log('Retrieved channels:', allChannels);
		} catch (error) {
			console.error('Error listing channels:', error);
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
  
	// POSTGRES FUNCTIONS
	const listenToPublicChanges = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for Postgres public changes');
			return;
		}
		
		try {
			console.log('Listening to public changes on channel:', selectedChannel);
			
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
					} else if (err) {
						console.error('Error subscribing to public changes:', err);
					}
				});
		} catch (error) {
			console.error('Error setting up public changes listener:', error);
		}
	};

	const listenToInsertsOnTodo = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for INSERT events');
			return;
		}
		
		try {
			console.log('Listening to INSERT events on channel:', selectedChannel);
			
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
					} else if (err) {
						console.error('Error subscribing to INSERT events:', err);
					}
				});
		} catch (error) {
			console.error('Error setting up INSERT listener:', error);
		}
	};

	const listenToUpdatesOnTodo = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for UPDATE events');
			return;
		}
		
		try {
			console.log('Listening to UPDATE events on channel:', selectedChannel);
			
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
					} else if (err) {
						console.error('Error subscribing to UPDATE events:', err);
					}
				});
		} catch (error) {
			console.error('Error setting up UPDATE listener:', error);
		}
	};

	const listenToDeletesOnTodo = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for DELETE events');
			return;
		}
		
		try {
			console.log('Listening to DELETE events on channel:', selectedChannel);
			
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
					} else if (err) {
						console.error('Error subscribing to DELETE events:', err);
					}
				});
		} catch (error) {
			console.error('Error setting up DELETE listener:', error);
		}
	};

	// BROADCAST FUNCTIONS
	const listenToBroadcast = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for broadcast events');
			return;
		}
		
		try {
			console.log('Listening to broadcast events on channel:', selectedChannel);
			
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
					} else if (err) {
						console.error('Error subscribing to broadcast events:', err);
					}
				});
		} catch (error) {
			console.error('Error setting up broadcast listener:', error);
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
				})
				.catch((err) => {
					console.error('Error sending broadcast:', err);
				});
		} catch (error) {
			console.error('Exception sending broadcast:', error);
		}
	};

	// PRESENCE FUNCTIONS
	const listenToSync = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for presence sync events');
			return;
		}
		
		try {
			console.log('Listening to presence sync events on channel:', selectedChannel);
			
			supabase
				.channel(selectedChannel)
				.on(
					'presence',
					{ event: 'sync' },
					(payload) => {
						console.log('Presence sync event received:', payload);
					}
				)
				.subscribe((status, err) => {
					if (status === 'SUBSCRIBED') {
						console.log('Successfully subscribed to presence sync events');
					} else if (err) {
						console.error('Error subscribing to presence sync events:', err);
					}
				});
		} catch (error) {
			console.error('Error setting up presence sync listener:', error);
		}
	};

    let joinState = $state('');
	const listenToJoin = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for presence join events');
			return;
		}
		
		try {
			console.log('Listening to presence join events on channel:', selectedChannel);
			
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
					} else if (err) {
						console.error('Error subscribing to presence join events:', err);
					}
				});
		} catch (error) {
			console.error('Error setting up presence join listener:', error);
		}
	};

    let leaveState = $state('');
	const listenToLeave = (selectedChannel: string) => {
		if (!selectedChannel) {
			console.warn('No channel selected for presence leave events');
			return;
		}
		
		try {
			console.log('Listening to presence leave events on channel:', selectedChannel);
			
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
					} else if (err) {
						console.error('Error subscribing to presence leave events:', err);
					}
				});
		} catch (error) {
			console.error('Error setting up presence leave listener:', error);
		}
	};

	// DATABASE OPERATIONS
	const insertIntoTodos = async () => {
		try {
			const randomVal = Math.floor(Math.random() * 10);
			console.log('Inserting random value into todos:', randomVal);
			
			const { data, error } = await supabase
				.from('todos')
				.insert({ random_value: randomVal });
			
			if (error) {
				console.error('Error inserting into todos:', error);
				return;
			}
			
			console.log('Successfully inserted into todos:', data);
		} catch (error) {
			console.error('Exception inserting into todos:', error);
		}
	};

	const updateTodo = async () => {
		try {
			const randomVal = Math.floor(Math.random() * 10);
			console.log('Updating todos with random value:', randomVal);
			
			const { data, error } = await supabase
				.from('todos')
				.update({ random_value: randomVal })
				.gt('random_value', 2);
			
			if (error) {
				console.error('Error updating todos:', error);
				return;
			}
			
			console.log('Successfully updated todos:', data);
		} catch (error) {
			console.error('Exception updating todos:', error);
		}
	};

	const deleteTodo = async () => {
		try {
			console.log('Deleting all vals');
			
			const { data, error } = await supabase
				.from('todos')
				.delete()
                .gt('id', 0);
			
			if (error) {
				console.error('Error deleting from todos:', error);
				return;
			}
			
			console.log('Successfully deleted from todos:', data);
		} catch (error) {
			console.error('Exception deleting from todos:', error);
		}
	};

	const getTodos = async () => {
		try {
			console.log('Fetching todos');
			
			const { data, error } = await supabase
				.from('todos')
				.select('*');
			
			if (error) {
				console.error('Error fetching todos:', error);
				return;
			}
			
			console.log('Successfully fetched todos:', data);
			todosValues = JSON.stringify(data, null, 2) + '\n';
		} catch (error) {
			console.error('Exception fetching todos:', error);
		}
	};

	// REALTIME V2 FUNCTIONS
	
	const listenToDeleteV2 = async (id: string) => {
		try {
			console.log('Setting up DELETE V2 listener');
			
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
					} else if (err) {
						console.error('Error subscribing to DELETE V2 events:', err);
					}
				});
		} catch (error) {
			console.error('Exception setting up DELETE V2 listener:', error);
		}
	};

</script>

<div>
	<h2>Used for testing access and RLS</h2>
	
	<!-- Authentication Section -->
	<section>
		<h4>Login</h4>
		<div>
			<input bind:value={username} placeholder="Username" />
			<input bind:value={password} placeholder="Password" type="password" />
			<button onclick={login}>Login</button>
			<button onclick={signout}>Sign out</button>
		</div>
	</section>

	<!-- Channel Management Section -->
	<section class='channelSection'>
		<h2>Channel Management</h2>
		
		<div>
			<h3>Create Channel:</h3>
			<input bind:value={channelName} placeholder="New Channel Name" />
			<button onclick={createChannel}>Create Channel</button>
		</div>
		
		<div>
			<h3>Refresh list of all channels</h3>
			<button onclick={() => listAllChannels()}>Get all channels</button>
			
			{#each allChannels as ch}
				<div>{ch}</div>
			{/each}
		</div>
		
		<div>
			<h3>Unsubscribe from Channel</h3>
			<select bind:value={channelId}>
				<option value={null}>Select a channel</option>
				{#each allChannels as ch}
					<option value={ch}>{ch}</option>
				{/each}
			</select>
			<button onclick={unsubscribeFromChannel}>Unsubscribe from Channel</button>
			<small>(will also remove channels without a subscription)</small>
		</div>
		
		<div>
			<button onclick={unsubscribeFromAllChannels}>Unsubscribe from All Channels</button>
		</div>
	</section>

	<!-- Database Operations Section -->
	<section>
		<h2>Database Operations</h2>
		
		<div>
			<h3>In <a href='https://supabase.com/dashboard/project/_/sql/'>Dashboard</a>, Create example table</h3>
			<pre>
create table if not exists public.todos (
    id serial not null,
    random_value int null,
    constraint todos_pkey primary key (id)
);              
			</pre>
		</div>
		
		<div>
			<h3>Enable RLS for example table</h3>
			<blockquote>
				The validation is done when the user connects, meaning if you update it during a conversation, 
				the user will not be impacted unless the connection is reloaded.
				For advanced examples, use the <a href='https://supabase.com/docs/guides/realtime/authorization'>realtime Auth guide</a>
			</blockquote>
			<pre>
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
		</div>
		
		<div>
			<h3>Insert into example table</h3>
			<pre>
insert into public.todos (random_value) 
values 
(1),
(2),
(3),
(4);
			</pre>
		</div>
		
		<div>
			<h3>Todos Operations</h3>
			<button onclick={getTodos}>Get todos</button>
			<pre>{todosValues}</pre>
			<div>
				<button onclick={insertIntoTodos}>Insert value between 1 and 10 into todos</button>
				<button onclick={updateTodo}>Update random value between 1 and 10 from todos</button>
				<button onclick={deleteTodo}>Delete all values from todos</button>
			</div>
		</div>
	</section>

	<!-- Postgres Changes Section -->
	<section>
		<h2>Standard Postgres Changes</h2>
		
		<div>
			<h3>Listen to all changes in public schema</h3>
			<select onfocus={() => listAllChannels()} bind:value={postgresChannel}>
				<option value={null}>Select a channel</option>
				{#each allChannels as ch}
					<option value={ch}>{ch}</option>
				{/each}
			</select>
			<button onclick={() => listenToPublicChanges(postgresChannel)}>Listen to all changes in public schema</button>
			<pre>{postgresPublicChanges}</pre>
		</div>
		
		<div>
			<h3>Listen to all inserts on table todo</h3>
			<select onfocus={() => listAllChannels()} bind:value={postgresInsertsChannel}>
				<option value={null}>Select a channel</option>
				{#each allChannels as ch}
					<option value={ch}>{ch}</option>
				{/each}
			</select>
			<button onclick={() => listenToInsertsOnTodo(postgresInsertsChannel)}>Listen to inserts on todo</button>
			<pre>{postgresInserts}</pre>
		</div>
		
		<div>
			<h3>Listen to all updates on table todo</h3>
			<select onfocus={() => listAllChannels()} bind:value={postgresUpdatesChannel}>
				<option value={null}>Select a channel</option>
				{#each allChannels as ch}
					<option value={ch}>{ch}</option>
				{/each}
			</select>
			<button onclick={() => listenToUpdatesOnTodo(postgresUpdatesChannel)}>Listen to updates on todo</button>
			<pre>{postgresUpdates}</pre>
		</div>
		
		<div>
			<h3>Listen to all deletes on table todo</h3>
			<select onfocus={() => listAllChannels()} bind:value={postgresDeletesChannel}>
				<option value={null}>Select a channel</option>
				{#each allChannels as ch}
					<option value={ch}>{ch}</option>
				{/each}
			</select>
			<button onclick={() => listenToDeletesOnTodo(postgresDeletesChannel)}>Listen to deletes on todo</button>
			<pre>{postgresDeletes}</pre>
		</div>
	</section>

	<!-- Broadcast Postgres V2 Section -->
	<section>
		<h2>Broadcast Postgres Changes V2</h2>
		
		<div>
			<h3>Benefits</h3>
			<ul>
				<li>Scales better with many connected users</li>
				<li>Sanitizes the payload of a message instead of providing the full record</li>
				<li>Reduces latency of sent messages</li>
			</ul>
		</div>
		
		<div>
			<h3>RLS</h3>
			<h4>Set up RLS condition</h4>
			<pre>
create policy "Allow authenticated access"
on todos
for select
to authenticated
using (true);
			</pre>
		</div>
		
		<div>
			<h4>Set up trigger on target table</h4>
			<pre>
				create or replace function public.your_table_changes()
				returns trigger
				as $$
				begin
					perform realtime.broadcast_changes(
						'topic:' || new.id::text,   -- topic
						   tg_op,                          -- event
						   tg_op,                          -- operation
						   tg_table_name,                  -- table
						   tg_table_schema,                -- schema
						   new,                            -- new record
						   old                             -- old record
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
		</div>
		
		<div>

            <select onfocus={() => listAllChannels()} bind:value={postgresDeletesChannelV2}>
				<option value={null}>Select a channel</option>
				{#each allChannels as ch}
					<option value={ch}>{ch}</option>
				{/each}
			</select>
			<button onclick={() => listenToDeleteV2(postgresDeletesChannelV2)}>Listen to Deletes V2</button>
			<pre>{listenToDeletesV2}</pre>
		</div>
	</section>

	<!-- Broadcasts Section -->
	<section>
		<h2>Broadcasts</h2>
		
		<div>
			<h3>Listen to Broadcasts</h3>
			<select onfocus={() => listAllChannels()} bind:value={broadcastChannel}>
				<option value={null}>Select a channel</option>
				{#each allChannels as ch}
					<option value={ch}>{ch}</option>
				{/each}
			</select>
			<button onclick={() => listenToBroadcast(broadcastChannel)}>Listen to Broadcasts</button>
			<pre>{broadcastMessageReceived}</pre>
		</div>
		
		<!-- <div>
			<h3>Subscribe to Broadcasts</h3>
			<select onfocus={() => listAllChannels()} bind:value={broadcastChannel}>
				<option value={null}>Select a channel</option>
				{#each allChannels as ch}
					<option value={ch}>{ch}</option>
				{/each}
			</select>
			<button onclick={() => subscribeToBroadcast(broadcastChannel)}>Subscribe to Broadcasts</button>
		</div> -->
		
		<div>
			<h3>Send Broadcast</h3>
			<select onfocus={() => listAllChannels()} bind:value={broadcastChannel}>
				<option value={null}>Select a channel</option>
				{#each allChannels as ch}
					<option value={ch}>{ch}</option>
				{/each}
			</select>
			<input bind:value={broadcastMessage} placeholder="Message" />
			<button onclick={() => sendBroadcast(broadcastChannel, broadcastMessage)}>Send Broadcast</button>
		</div>
	</section>

    <!-- Presence functions -->
     <h2>Presence functions</h2>
    <div>
        <h3>Listen to users join</h3>
        <select onfocus={() => listAllChannels()} bind:value={presenceChannel}>
            <option value={null}>Select a channel</option>
            {#each allChannels as ch}
                <option value={ch}>{ch}</option>
            {/each}
        </select>
        <button onclick={() => listenToJoin(presenceChannel)}>Listen to users join</button>
        <pre>{joinState}</pre>

    </div>
    <div>
        <h3>Listen to leave events (tells you when a user leaves a room)</h3>
        <select onfocus={() => listAllChannels()} bind:value={presenceChannel}>
            <option value={null}>Select a channel</option>
            {#each allChannels as ch}
                <option value={ch}>{ch}</option>
            {/each}
        </select>
        <button onclick={() => listenToLeave(presenceChannel)}>Listen to users leave</button>
        <pre>{leaveState}</pre>

    </div>

    <div>
        <h3>Listen to sync events (tells you all trackable users in a room)</h3>
        <select onfocus={() => listAllChannels()} bind:value={presenceChannel}>
            <option value={null}>Select a channel</option>
            {#each allChannels as ch}
                <option value={ch}>{ch}</option>
            {/each}
        </select>
        <button onclick={() => listenToSync(presenceChannel)}>Listen to users leave</button>
        <pre>{syncState}</pre>

    </div>
</div>

