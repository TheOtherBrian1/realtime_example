<script lang='ts'>
	import { createClient } from '@supabase/supabase-js';
	import type { RealtimeChannel } from '@supabase/supabase-js';
  
	const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0YXRsbGZudG9vaGdqcGtpbXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MDAzMTQsImV4cCI6MjA1OTE3NjMxNH0.gEjSVfseiLuoMzi_YQA8wCmCWiynmmhhLa8JWAeOnYo'
	const SUPABASE_URL = 'https://etatllfntoohgjpkimws.supabase.co';
	const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
	
	// Authentication:-----------------------------
	const login = async () => {
	  let { data, error } = await supabase.auth.signInWithPassword({
		email: 'brian@supabase.io',
		password: 'Password123'
	  });
	  console.log(data)
	  console.log(error)
	}
	const signout = async () => {
	  let { error } = await supabase.auth.signOut();
	  console.log(error)
	}

	let username = $state('');
	let password = $state('');
  
	// // Maintenance tasks:------------------
	let channel: RealtimeChannel | null = $state(null);
	let broadcastMessage: string = $state('');
	let channelId: string | null = $state('');
	let postgresChannel: string = $state('');
	let postgresInsertsChannel: string = $state('');
	let postgresUpdatesChannel: string = $state('');
	let postgresDeletesChannel: string = $state('');
	let broadcastChannel: string = $state('');

	let allChannels: string[] = $state([]);
	let channelName = $state('');
	let channelToRemove = $state('');
	let postgresPublicChanges = $state('');
	let postgresInserts = $state('');
	let postgresUpdates = $state('');
	let postgresDeletes = $state('');
	let broadcastMessageReceived = $state('');
	let listenToDeletesV2 = $state('');
	$inspect(allChannels)
  
	// CHANNEL MANAGEMENT --------------------------------------------------
	const listAllChannels = () => {
		try {
		  allChannels = []
		  allChannels = supabase.getChannels().map(ch => ch.subTopic);
		  console.log(allChannels)
		} catch (error) {
		  console.error(error);
		}
	}
  
	const createChannel = async () => {
	  try {
		channel = supabase.channel(channelName);
		console.log(channel)
	  } catch (error) {
		console.error(error);
	  }
	}
  
	const unsubscribeFromChannel = () => {
	  const allChannels = supabase.getChannels();
	  if (channelId) {
		console.log(channelId)
		let activeChannel = allChannels.find(ch => ch.subTopic === channelId);
		if (activeChannel) {
		  try {
			  supabase.removeChannel(activeChannel);
		  } catch (error) {
			  console.error(error);
		  }
		}
	  }
	}
  
	const unsubscribeFromAllChannels = () => {
		try {
			supabase.removeAllChannels();
			channel = null;
			postgresChannel = '';
			allChannels = [];
			console.log('All channels unsubscribed')
		} catch (error) {
			console.error(error);
		}

	}
  
	// LISTEN TO POSTGRES CHANGES -------------------------------------------

	let todosValues = $state('');
	const listenToPublicChanges = (selectedChannel: string) => {
	if (selectedChannel) {
		console.log(selectedChannel)
		supabase
		.channel(selectedChannel)
		.on(
			'postgres_changes',
			{
			event: '*',
			schema: 'public',
			},
			(payload) => {
				console.log(payload)
			postgresPublicChanges = JSON.stringify(payload, null, 2);
			}
		)
		.subscribe((status, err) => {
			if (status === 'SUBSCRIBED') {
			console.log('Connected!');
			} else if (err) {
			console.error(err);
			}
		});
	}
	}

	const listenToInsertsOnTodo = (selectedChannel: string) => {
		console.log('listenToInsertsOnTodo', selectedChannel)
	if (selectedChannel) {
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
			postgresInserts = JSON.stringify(payload, null, 2);
			}
		)
		.subscribe((status, err) => {
			if (status === 'SUBSCRIBED') {
			console.log('Connected!');
			} else if (err) {
			console.error(err);
			}
		});
	}
	}

	const listenToUpdatesOnTodo = (selectedChannel: string) => {
	if (selectedChannel) {
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
			postgresUpdates = JSON.stringify(payload, null, 2);
			}
		)
		.subscribe((status, err) => {
			if (status === 'SUBSCRIBED') {
			console.log('Connected!');
			} else if (err) {
			console.error(err);
			}
		});
	}
	}

	const listenToDeletesOnTodo = (selectedChannel: string) => {
	if (selectedChannel) {
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
			postgresDeletes = JSON.stringify(payload, null, 2);
			}
		)
		.subscribe((status, err) => {
			if (status === 'SUBSCRIBED') {
			console.log('Connected!');
			} else if (err) {
			console.error(err);
			}
		});
	}
	}

	// LISTEN TO BROADCASTS --------------------------------------------------
	const listenToBroadcast = (selectedChannel: string) => {
		if (selectedChannel) {
			console.log(selectedChannel)
			supabase
			.channel(selectedChannel)
			.on(
				'broadcast',
				{ event: 'shout' }, // Listen for "shout". Can be "*" to listen to all events
				(payload) => {
					console.log(payload)
					broadcastMessageReceived = JSON.stringify(payload, null, 2);
				}
			);
		}
	}

	const subscribeToBroadcast = (selectedChannel: string) => {
		if (selectedChannel) {
			console.log(selectedChannel)
			supabase
			.channel(selectedChannel)	
			.subscribe((status, err) => {
				if (status === 'SUBSCRIBED') {
				console.log('Subscribed to broadcast channel:', selectedChannel);
				} else if (err) {
				console.error(err);
				}
			})
	}}

	const sendBroadcast = (selectedChannel: string, message: string) => {
		if (selectedChannel) {
			console.log(selectedChannel)
			supabase
			.channel(selectedChannel)
			.send({
				type: 'broadcast',
				event: 'shout',
				payload: { message },
			})
			.catch((err) => {
				console.error(err);
			})
		}
	}
	

	// LISTEN TO PRESENCE --------------------------------------------------
	const listenToSync = (selectedChannel: string) => {
		if (selectedChannel) {
			console.log(selectedChannel)
			supabase
			.channel(selectedChannel)
			.on(
				'presence',
				{ event: 'sync' },
				(payload) => {
					console.log(payload)
				}
			).subscribe((status, err) => {
				if (status === 'SUBSCRIBED') {
					console.log('Listening to sync events!');
				} else if (err) {
					console.error(err);
				}
		})
		}
	}

	const listenToJoin = (selectedChannel: string) => {
		if (selectedChannel) {
			console.log(selectedChannel)
			supabase
			.channel(selectedChannel)
			.on(
				'presence',
				{ event: 'join' },
				(payload) => {
					console.log(payload)
				}
			)
			.subscribe((status, err) => {
			if (status === 'SUBSCRIBED') {
			console.log('Listening to join events!');
			} else if (err) {
			console.error(err);
			}
		})
		}
	}

	const listenToLeave = (selectedChannel: string) => {
		if (selectedChannel) {
			console.log(selectedChannel)
			supabase
			.channel(selectedChannel)
			.on(
				'presence',
				{ event: 'leave' },
				(payload) => {
					console.log(payload)
				}
			).subscribe((status, err) => {
			if (status === 'SUBSCRIBED') {
			console.log('Listening to leave events!');
			} else if (err) {
			console.error(err);
			}
		})
		}
	}

	const insertIntoTodos = async () => {
		const randomVal = Math.floor(Math.random() * 10);
		const { data, error } = await supabase
		.from('todos')
		.insert(
			{ random_value: randomVal }
		)
		
		if (error) {
			console.error(error);
		}
	}

	const updateTodo = async () => {
		const randomVal = Math.floor(Math.random() * 10);
		const { data, error } = await supabase
		.from('todos')
		.update(
			{ random_value: randomVal }
		)
		.gt('random_value', 2)
		
		if (error) {
			console.error(error);
		}
	}

	const deleteTodo = async () => {
		const randomVal = Math.floor(Math.random() * 10);
		const { data, error } = await supabase
		.from('todos')
		.delete()
		.gt('random_value', randomVal)
		
		if (error) {
			console.error(error);
		}
	}

	const getTodos = async () => {
		const { data, error } = await supabase
		.from('todos')
		.select('*')
		
		if (error) {
			console.error(error);
		}
		else{
			todosValues = JSON.stringify(data, null, 2) + '\n';
		}
	}

	const id = 'id'
	const listenToDeleteV2 = async () => {
		await supabase.realtime.setAuth() // Needed for Realtime Authorization
		supabase
		.channel(`topic:${id}`, {
			config: { private: true },
		})
		.on('broadcast', { event: 'DELETE' }, (payload) => listenToDeletesV2 = JSON.stringify(payload, null, 2))
		.subscribe((status, err) => {
			if (status === 'SUBSCRIBED') {
			console.log('Listening to DELETEs V2');
			} else if (err) {
			console.error(err);
			}
		})
	}

</script>

<h2>Used for testing access and RLS</h2>
<h4>Login</h4>
<input bind:value={username} placeholder="Username" />
<input bind:value={password} placeholder="Password" type="password" />
<button onclick={login}>Login</button>
<button onclick={signout}>Sign out</button>

<div class='channelSection'>
  <div class='channelSection'>
	<h2>Create Channel:</h2>
	<input bind:value={channelName} placeholder="New Channel Name" />
	<button onclick={createChannel}>Create Channel</button>
	<div>
	  <h3>Refresh list of all channels</h3>
	  <button onclick={() => listAllChannels()}>Get all channels</button>

	  {#each allChannels as ch}
		<div>{ch}</div>
	  {/each}
	</div>
  </div>

  <div>
	<select bind:value={channelId}>
		<option value={null}>Select a channel</option>
		{#each allChannels as ch}
		  <option value={ch}>{ch}</option>
		{/each}
	  </select>
	<button onclick={unsubscribeFromChannel}>Unsubscribe from Channel (will also remove channels without a subscription)</button>
  </div>
  <button onclick={unsubscribeFromAllChannels}>Unsubscribe from All Channels</button>

<!-- Postgres Changes:---------------------------------->


  <div>
	<h2>In <a href='https://supabase.com/dashboard/project/_/sql/'>Dashboard</a>, Create example table</h2>

	<pre>
		create table public.todos (
			id serial not null,
			random_value int null,
			constraint todos_pkey primary key (id)
		)
	</pre>

	<h2>Enable RLS for example table</h2>
	<quote>The validation is done when the user connects, meaning if you update it during a conversation, the user will not be impacted unless the connection is reloaded.
		For advanced examples, use the <a href='https://supabase.com/docs/guides/realtime/authorization'>realtime Auth guide</a>
	</quote>
	<pre>
		-- Turn on security
		alter table "todos"
		enable row level security;

		-- Allow anonymous access
		create policy "Allow anonymous access"
		on todos
		for select
		to anon
		using (true);
	</pre>

	<h2>Insert into example table</h2>
	<pre>
		insert into public.todos (random_value) 
		values 
		(1),
		(2),
		(3),
		(4);
	</pre>

	<button onclick={getTodos}>Get todos</button>
	<pre>
		{todosValues}
	</pre>
	<button onclick={insertIntoTodos}>Insert value between 1 and 5 into todos</button>
	<button onclick={updateTodo}>Update random value between 1 and 5 from todos</button>
	<button onclick={deleteTodo}>Delete all values from todos</button>

  </div>

  <div class='listenSection'>
	<h2>Standard Postgres Changes</h2>

	<h4>Listen to all changes in public schema</h4>
	<select onfocus={() => listAllChannels()} bind:value={postgresChannel}>
	  <option value={null}>Select a channel</option>
	  {#each allChannels as ch}
		<option value={ch}>{ch}</option>
	  {/each}
	</select>
	<button onclick={() => listenToPublicChanges(postgresChannel)}>Listen to all changes in public schema</button>
	<pre>
	  {postgresPublicChanges}
	</pre>
</div>
</div>


  
  

  
  


<h4>Listen to all inserts on table todo</h4>
<select onfocus={() => listAllChannels()} bind:value={postgresInsertsChannel}>
	<option value={null}>Select a channel</option>
	{#each allChannels as ch}
	<option value={ch}>{ch}</option>
	{/each}
</select>
<button onclick={() => listenToInsertsOnTodo(postgresInsertsChannel)}>Listen to inserts on todo</button>
<pre>
	{postgresInserts}
</pre>

<h4>Listen to all updates on table todo</h4>
<select onfocus={() => listAllChannels()} bind:value={postgresUpdatesChannel}>
	<option value={null}>Select a channel</option>
	{#each allChannels as ch}
	<option value={ch}>{ch}</option>
	{/each}
</select>
<button onclick={() => listenToUpdatesOnTodo(postgresUpdatesChannel)}>Listen to updates on todo</button>
<pre>
	{postgresUpdates}
</pre>

<h4>Listen to all deletes on table todo</h4>
<select onfocus={() => listAllChannels()} bind:value={postgresDeletesChannel}>
	<option value={null}>Select a channel</option>
	{#each allChannels as ch}
	<option value={ch}>{ch}</option>
	{/each}
</select>
<button onclick={() => listenToDeletesOnTodo(postgresDeletesChannel)}>Listen to deletes on todo</button>
<pre>
	{postgresDeletes}
</pre>



<!-- Broadcast Postgres changes V2 -->
<h2>Broadcast Postgres Changes V2</h2>

<h3>Benefits</h3>
<ul>
	<li> Scales better with many connected users</li>
	<li> Sanitizes the payload of a message instead of providing the full record</li>
	<li> Reduces latency of sent messages</li>
</ul>
<h3>Drawbacks</h3>
<ul>
	<li> </li>
</ul>


<h3>RLS</h3>
<h4>Set up RLS condition</h4>
<pre>
	create policy "Allow anonymous access"
	on todos
	for select
	to anon
	using (true);
</pre>

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

<button onclick={() => listenToDeleteV2()}>Listen to Deletes V2</button>
<pre>
	{listenToDeletesV2}
</pre>

<!-- Broadcasts:---------------------------------->
<h4>Listen to Broadcasts</h4>
<select onfocus={() => listAllChannels()} bind:value={broadcastChannel}>
	<option value={null}>Select a channel</option>
	{#each allChannels as ch}
	<option value={ch}>{ch}</option>
	{/each}
</select>
<button onclick={() => listenToBroadcast(broadcastChannel)}>Listen to Broadcasts</button>
<pre>
	{broadcastMessageReceived}
</pre>

<h4>Subscribe to Broadcasts</h4>
<select onfocus={() => listAllChannels()} bind:value={broadcastChannel}>
	<option value={null}>Select a channel</option>
	{#each allChannels as ch}
	<option value={ch}>{ch}</option>
	{/each}
</select>
<button onclick={() => subscribeToBroadcast(broadcastChannel)}>Subscribe to Broadcasts</button>

<h4>Send Broadcast</h4>
<select onfocus={() => listAllChannels()} bind:value={broadcastChannel}>
	<option value={null}>Select a channel</option>
	{#each allChannels as ch}
	<option value={ch}>{ch}</option>
	{/each}
</select>
<input bind:value={broadcastMessage} placeholder="Message" />
<button onclick={() => sendBroadcast(broadcastChannel, broadcastMessage)}>Send Broadcast</button>

<style>
.channelSection {
	max-width: 300px;
	padding: 1rem;
	display: flex;
	flex-direction: column;
}

pre {
	background-color: #f5f5f5;
	padding: 1rem;
	border-radius: 4px;
	overflow: auto;
	max-height: 200px;
}
</style>

