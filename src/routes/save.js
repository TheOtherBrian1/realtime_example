<script>
import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database
const supabase = createClient('https://mkibhcuhjudhbfelxkvd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raWJoY3VoanVkaGJmZWx4a3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5NDk1NzksImV4cCI6MjA1NzUyNTU3OX0.vjdKRqncP5JpS0lAavLnmMe9bTLVY7vClvzAoLZafwU')


const login = async ()=>{

  let { data, error } = await supabase.auth.signInWithPassword({
    email: 'brian@supabase.io',
    password: 'pickles123'
  })

}
const updateUser = async()=>{
  const { data, error } = await supabase.auth.updateUser({
    email: "brian@supabase.io",
    password: "pickles123",
    data: { hello: 'world' }
  })
}

const callDucks = async ()=>{

let { data: ducks, error } = await supabase
  .from('ducks')
  .select('id')

}

const callSigned = async ()=>{
    const { data, error } = await supabase
    .storage
    .from('avatars')
    .createSignedUrls(['folder/avatar1.png', 'folder/avatar2.png'], 60)

  console.log(data)
}

const uploadSignedURL = async ()=>{
    const { data, error } = await supabase
  .storage
  .from('avatars')
  .createSignedUploadUrl('folder/cat.jpg')

  console.log(data)
}

const uploadSignedURLDownload = async ()=>{
        const { data } = await supabase
    .storage
    .from('outputs')
    .createSignedUrl('df9f6cd9-2515-4bce-bd87-4a8fea81c723/111109-Scott-Ray-03-06-2025_(sdRLcl)_deposition_memo.docx"', 60, {
        download: true,
    })


  console.log(data)
}
</script>

<button onclick={callSigned}>Call Signed</button>
<button onclick={uploadSignedURL}>Upload Signed</button>
<button onclick={uploadSignedURLDownload}>Upload Signed Download</button>
<button onclick={login}>Login</button>
<button onclick={updateUser}>Update User</button>
<button onclick={callDucks}>Call Ducks</button>

curl -w "Connect time: %{time_connect}\nTime to first byte: %{time_starttransfer}\nTotal: %{time_total}\n" -o /dev/null -sL -X POST 'https://mkibhcuhjudhbfelxkvd.supabase.co/storage/v1/object/list/saveas' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raWJoY3VoanVkaGJmZWx4a3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5NDk1NzksImV4cCI6MjA1NzUyNTU3OX0.vjdKRqncP5JpS0lAavLnmMe9bTLVY7vClvzAoLZafwU' \
  -H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raWJoY3VoanVkaGJmZWx4a3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5NDk1NzksImV4cCI6MjA1NzUyNTU3OX0.vjdKRqncP5JpS0lAavLnmMe9bTLVY7vClvzAoLZafwU' \
  -H 'content-type: application/json' \
  --data-raw '{"limit":100,"offset":0,"sortBy":{"column":"name","order":"asc"},"prefix":"userId/remoteId/assets"}' -->

