Assistants API quickstart

Beta

=================================

Step-by-step guide to creating an assistant.

A typical integration of the Assistants API has the following flow:

1.  Create an [Assistant](/docs/api-reference/assistants/createAssistant) by defining its custom instructions and picking a model. If helpful, add files and enable tools like Code Interpreter, File Search, and Function calling.
2.  Create a [Thread](/docs/api-reference/threads) when a user starts a conversation.
3.  Add [Messages](/docs/api-reference/messages) to the Thread as the user asks questions.
4.  [Run](/docs/api-reference/runs) the Assistant on the Thread to generate a response by calling the model and the tools.

This starter guide walks through the key steps to create and run an Assistant that uses [Code Interpreter](/docs/assistants/tools/code-interpreter). In this example, we're [creating an Assistant](/docs/api-reference/assistants/createAssistant) that is a personal math tutor, with the Code Interpreter tool enabled.

Calls to the Assistants API require that you pass a beta HTTP header. This is handled automatically if you’re using OpenAI’s official Python or Node.js SDKs. `OpenAI-Beta: assistants=v2`

Step 1: Create an Assistant
---------------------------

An [Assistant](/docs/api-reference/assistants/object) represents an entity that can be configured to respond to a user's messages using several parameters like `model`, `instructions`, and `tools`.

Create an Assistant

```javascript
import OpenAI from "openai";
const openai = new OpenAI();

async function main() {
const assistant = await openai.beta.assistants.create({
  name: "Math Tutor",
  instructions: "You are a personal math tutor. Write and run code to answer math questions.",
  tools: [{ type: "code_interpreter" }],
  model: "gpt-4o"
});
}

main();
```

```bash
curl "https://api.openai.com/v1/assistants" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-H "OpenAI-Beta: assistants=v2" \
-d '{
  "instructions": "You are a personal math tutor. Write and run code to answer math questions.",
  "name": "Math Tutor",
  "tools": [{"type": "code_interpreter"}],
  "model": "gpt-4o"
}'
```

Step 2: Create a Thread
-----------------------

A [Thread](/docs/api-reference/threads/object) represents a conversation between a user and one or many Assistants. You can create a Thread when a user (or your AI application) starts a conversation with your Assistant.

Create a Thread
```javascript
const thread = await openai.beta.threads.create();
```

```bash
curl https://api.openai.com/v1/threads \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-H "OpenAI-Beta: assistants=v2" \
-d ''
```

Step 3: Add a Message to the Thread
-----------------------------------

The contents of the messages your users or applications create are added as [Message](/docs/api-reference/messages/object) objects to the Thread. Messages can contain both text and files. There is a limit of 100,000 Messages per Thread and we smartly truncate any context that does not fit into the model's context window.

Add a Message to the Thread

```javascript
const message = await openai.beta.threads.messages.create(
thread.id,
{
  role: "user",
  content: "I need to solve the equation `3x + 11 = 14`. Can you help me?"
}
);
```

```bash
curl https://api.openai.com/v1/threads/thread_abc123/messages \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-H "OpenAI-Beta: assistants=v2" \
-d '{
    "role": "user",
    "content": "I need to solve the equation `3x + 11 = 14`. Can you help me?"
  }'
```

Step 4: Create a Run
--------------------

Once all the user Messages have been added to the Thread, you can [Run](/docs/api-reference/runs/object) the Thread with any Assistant. Creating a Run uses the model and tools associated with the Assistant to generate a response. These responses are added to the Thread as `assistant` Messages.

With streamingWithout streaming

You can use the 'create and stream' helpers in the Python and Node SDKs to create a run and stream the response.

Create and Stream a Run

```javascript
// We use the stream SDK helper to create a run with
// streaming. The SDK provides helpful event listeners to handle 
// the streamed response.

const run = openai.beta.threads.runs.stream(thread.id, {
  assistant_id: assistant.id
})
  .on('textCreated', (text) => process.stdout.write('\nassistant > '))
  .on('textDelta', (textDelta, snapshot) => process.stdout.write(textDelta.value))
  .on('toolCallCreated', (toolCall) => process.stdout.write(`\nassistant > ${toolCall.type}\n\n`))
  .on('toolCallDelta', (toolCallDelta, snapshot) => {
    if (toolCallDelta.type === 'code_interpreter') {
      if (toolCallDelta.code_interpreter.input) {
        process.stdout.write(toolCallDelta.code_interpreter.input);
      }
      if (toolCallDelta.code_interpreter.outputs) {
        process.stdout.write("\noutput >\n");
        toolCallDelta.code_interpreter.outputs.forEach(output => {
          if (output.type === "logs") {
            process.stdout.write(`\n${output.logs}\n`);
          }
        });
      }
    }
  });
```

See the full list of Assistants streaming events in our API reference [here](/docs/api-reference/assistants-streaming/events). You can also see a list of SDK event listeners for these events in the [Python](https://github.com/openai/openai-python/blob/main/helpers.md#assistant-events) & [Node](https://github.com/openai/openai-node/blob/master/helpers.md#assistant-events) repository documentation.

Next steps
----------

1.  Continue learning about Assistants Concepts in the [Deep Dive](/docs/assistants/deep-dive)
2.  Learn more about [Tools](/docs/assistants/tools)
3.  Explore the [Assistants playground](/playground?mode=assistant)
4.  Check out our [Assistants Quickstart app](https://github.com/openai/openai-assistants-quickstart) on github

Was this page useful?


Assistants API deep dive

Beta

================================

In-depth guide to creating and managing assistants.

As described in the [Assistants Overview](/docs/assistants/overview), there are several concepts involved in building an app with the Assistants API.

This guide goes deeper into each of these concepts.

If you want to get started coding right away, check out the [Assistants API Quickstart](/docs/assistants/quickstart).

Creating Assistants
-------------------

We recommend using OpenAI's [latest models](/docs/models#gpt-4-turbo-and-gpt-4) with the Assistants API for best results and maximum compatibility with tools.

To get started, creating an Assistant only requires specifying the `model` to use. But you can further customize the behavior of the Assistant:

1.  Use the `instructions` parameter to guide the personality of the Assistant and define its goals. Instructions are similar to system messages in the Chat Completions API.
2.  Use the `tools` parameter to give the Assistant access to up to 128 tools. You can give it access to OpenAI-hosted tools like `code_interpreter` and `file_search`, or call a third-party tools via a `function` calling.
3.  Use the `tool_resources` parameter to give the tools like `code_interpreter` and `file_search` access to files. Files are uploaded using the `File` [upload endpoint](/docs/api-reference/files/create) and must have the `purpose` set to `assistants` to be used with this API.

For example, to create an Assistant that can create data visualization based on a `.csv` file, first upload a file.

```python
file = client.files.create(
file=open("revenue-forecast.csv", "rb"),
purpose='assistants'
)
```

```javascript
const file = await openai.files.create({
file: fs.createReadStream("revenue-forecast.csv"),
purpose: "assistants",
});
```

```bash
curl https://api.openai.com/v1/files \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-F purpose="assistants" \
-F file="@revenue-forecast.csv"
```

Then, create the Assistant with the `code_interpreter` tool enabled and provide the file as a resource to the tool.

```python
assistant = client.beta.assistants.create(
name="Data visualizer",
description="You are great at creating beautiful data visualizations. You analyze data present in .csv files, understand trends, and come up with data visualizations relevant to those trends. You also share a brief text summary of the trends observed.",
model="gpt-4o",
tools=[{"type": "code_interpreter"}],
tool_resources={
  "code_interpreter": {
    "file_ids": [file.id]
  }
}
)
```

```javascript
const assistant = await openai.beta.assistants.create({
name: "Data visualizer",
description: "You are great at creating beautiful data visualizations. You analyze data present in .csv files, understand trends, and come up with data visualizations relevant to those trends. You also share a brief text summary of the trends observed.",
model: "gpt-4o",
tools: [{"type": "code_interpreter"}],
tool_resources: {
  "code_interpreter": {
    "file_ids": [file.id]
  }
}
});
```

```bash
curl https://api.openai.com/v1/assistants \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-H "Content-Type: application/json" \
-H "OpenAI-Beta: assistants=v2" \
-d '{
  "name": "Data visualizer",
  "description": "You are great at creating beautiful data visualizations. You analyze data present in .csv files, understand trends, and come up with data visualizations relevant to those trends. You also share a brief text summary of the trends observed.",
  "model": "gpt-4o",
  "tools": [{"type": "code_interpreter"}],
  "tool_resources": {
    "code_interpreter": {
      "file_ids": ["file-BK7bzQj3FfZFXr7DbL6xJwfo"]
    }
  }
}'
```

You can attach a maximum of 20 files to `code_interpreter` and 10,000 files to `file_search` (using `vector_store` [objects](/docs/api-reference/vector-stores/object)).

Each file can be at most 512 MB in size and have a maximum of 5,000,000 tokens. By default, the size of all the files uploaded in your project cannot exceed 100 GB, but you can reach out to our support team to increase this limit.

Managing Threads and Messages
-----------------------------

Threads and Messages represent a conversation session between an Assistant and a user. There is a limit of 100,000 Messages per Thread. Once the size of the Messages exceeds the context window of the model, the Thread will attempt to smartly truncate messages, before fully dropping the ones it considers the least important.

You can create a Thread with an initial list of Messages like this:

```python
thread = client.beta.threads.create(
messages=[
  {
    "role": "user",
    "content": "Create 3 data visualizations based on the trends in this file.",
    "attachments": [
      {
        "file_id": file.id,
        "tools": [{"type": "code_interpreter"}]
      }
    ]
  }
]
)
```

```javascript
const thread = await openai.beta.threads.create({
messages: [
  {
    "role": "user",
    "content": "Create 3 data visualizations based on the trends in this file.",
    "attachments": [
      {
        file_id: file.id,
        tools: [{type: "code_interpreter"}]
      }
    ]
  }
]
});
```

```bash
curl https://api.openai.com/v1/threads \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-H "Content-Type: application/json" \
-H "OpenAI-Beta: assistants=v2" \
-d '{
  "messages": [
    {
      "role": "user",
      "content": "Create 3 data visualizations based on the trends in this file.",
      "attachments": [
        {
          "file_id": "file-ACq8OjcLQm2eIG0BvRM4z5qX",
          "tools": [{"type": "code_interpreter"}]
        }
      ]
    }
  ]
}'
```

Messages can contain text, images, or file attachment. Message `attachments` are helper methods that add files to a thread's `tool_resources`. You can also choose to add files to the `thread.tool_resources` directly.

### Creating image input content

Message content can contain either external image URLs or File IDs uploaded via the [File API](/docs/api-reference/files/create). Only [models](/docs/models) with Vision support can accept image input. Supported image content types include png, jpg, gif, and webp. When creating image files, pass `purpose="vision"` to allow you to later download and display the input content. Currently, there is a 100GB limit per project. Please contact us to request a limit increase.

Tools cannot access image content unless specified. To pass image files to Code Interpreter, add the file ID in the message `attachments` list to allow the tool to read and analyze the input. Image URLs cannot be downloaded in Code Interpreter today.



```javascript
import fs from "fs";
const file = await openai.files.create({
file: fs.createReadStream("myimage.png"),
purpose: "vision",
});
const thread = await openai.beta.threads.create({
messages: [
  {
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": "What is the difference between these images?"
      },
      {
        "type": "image_url",
        "image_url": {"url": "https://example.com/image.png"}
      },
      {
        "type": "image_file",
        "image_file": {"file_id": file.id}
      },
    ]
  }
]
});
```

```bash
# Upload a file with an "vision" purpose
curl https://api.openai.com/v1/files \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-F purpose="vision" \
-F file="@/path/to/myimage.png"

## Pass the file ID in the content
curl https://api.openai.com/v1/threads \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-H "Content-Type: application/json" \
-H "OpenAI-Beta: assistants=v2" \
-d '{
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is the difference between these images?"
        },
        {
          "type": "image_url",
          "image_url": {"url": "https://example.com/image.png"}
        },
        {
          "type": "image_file",
          "image_file": {"file_id": file.id}
        }
      ]
    }
  ]
}'
```

#### Low or high fidelity image understanding

By controlling the `detail` parameter, which has three options, `low`, `high`, or `auto`, you have control over how the model processes the image and generates its textual understanding.

*   `low` will enable the "low res" mode. The model will receive a low-res 512px x 512px version of the image, and represent the image with a budget of 85 tokens. This allows the API to return faster responses and consume fewer input tokens for use cases that do not require high detail.
*   `high` will enable "high res" mode, which first allows the model to see the low res image and then creates detailed crops of input images based on the input image size. Use the [pricing calculator](https://openai.com/api/pricing/) to see token counts for various image sizes.


```javascript
const thread = await openai.beta.threads.create({
messages: [
  {
    "role": "user",
    "content": [
        {
          "type": "text",
          "text": "What is this an image of?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/image.png",
            "detail": "high"
          }
        },
    ]
  }
]
});
```

```bash
curl https://api.openai.com/v1/threads \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-H "Content-Type: application/json" \
-H "OpenAI-Beta: assistants=v2" \
-d '{
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "What is this an image of?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/image.png",
            "detail": "high"
          }
        },
      ]
    }
  ]
}'
```

### Context window management

The Assistants API automatically manages the truncation to ensure it stays within the model's maximum context length. You can customize this behavior by specifying the maximum tokens you'd like a run to utilize and/or the maximum number of recent messages you'd like to include in a run.

#### Max Completion and Max Prompt Tokens

To control the token usage in a single Run, set `max_prompt_tokens` and `max_completion_tokens` when creating the Run. These limits apply to the total number of tokens used in all completions throughout the Run's lifecycle.

For example, initiating a Run with `max_prompt_tokens` set to 500 and `max_completion_tokens` set to 1000 means the first completion will truncate the thread to 500 tokens and cap the output at 1000 tokens. If only 200 prompt tokens and 300 completion tokens are used in the first completion, the second completion will have available limits of 300 prompt tokens and 700 completion tokens.

If a completion reaches the `max_completion_tokens` limit, the Run will terminate with a status of `incomplete`, and details will be provided in the `incomplete_details` field of the Run object.

When using the File Search tool, we recommend setting the max\_prompt\_tokens to no less than 20,000. For longer conversations or multiple interactions with File Search, consider increasing this limit to 50,000, or ideally, removing the max\_prompt\_tokens limits altogether to get the highest quality results.

#### Truncation Strategy

You may also specify a truncation strategy to control how your thread should be rendered into the model's context window. Using a truncation strategy of type `auto` will use OpenAI's default truncation strategy. Using a truncation strategy of type `last_messages` will allow you to specify the number of the most recent messages to include in the context window.

### Message annotations

Messages created by Assistants may contain [`annotations`](/docs/api-reference/messages/object#messages/object-content) within the `content` array of the object. Annotations provide information around how you should annotate the text in the Message.

There are two types of Annotations:

1.  `file_citation`: File citations are created by the [`file_search`](/docs/assistants/tools/file-search) tool and define references to a specific file that was uploaded and used by the Assistant to generate the response.
2.  `file_path`: File path annotations are created by the [`code_interpreter`](/docs/assistants/tools/code-interpreter) tool and contain references to the files generated by the tool.

When annotations are present in the Message object, you'll see illegible model-generated substrings in the text that you should replace with the annotations. These strings may look something like `【13†source】` or `sandbox:/mnt/data/file.csv`. Here’s an example python code snippet that replaces these strings with information present in the annotations.

```python
# Retrieve the message object
message = client.beta.threads.messages.retrieve(
thread_id="...",
message_id="..."
)
# Extract the message content
message_content = message.content[0].text
annotations = message_content.annotations
citations = []
# Iterate over the annotations and add footnotes
for index, annotation in enumerate(annotations):
  # Replace the text with a footnote
  message_content.value = message_content.value.replace(annotation.text, f' [{index}]')
  # Gather citations based on annotation attributes
  if (file_citation := getattr(annotation, 'file_citation', None)):
      cited_file = client.files.retrieve(file_citation.file_id)
      citations.append(f'[{index}] {file_citation.quote} from {cited_file.filename}')
  elif (file_path := getattr(annotation, 'file_path', None)):
      cited_file = client.files.retrieve(file_path.file_id)
      citations.append(f'[{index}] Click <here> to download {cited_file.filename}')
      # Note: File download functionality not implemented above for brevity
# Add footnotes to the end of the message before displaying to user
message_content.value += '\n' + '\n'.join(citations)
```

Runs and Run Steps
------------------

When you have all the context you need from your user in the Thread, you can run the Thread with an Assistant of your choice.


```javascript
const run = await openai.beta.threads.runs.create(
thread.id,
{ assistant_id: assistant.id }
);
```

```bash
curl https://api.openai.com/v1/threads/THREAD_ID/runs \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-H "Content-Type: application/json" \
-H "OpenAI-Beta: assistants=v2" \
-d '{
  "assistant_id": "asst_ToSF7Gb04YMj8AMMm50ZLLtY"
}'
```

By default, a Run will use the `model` and `tools` configuration specified in Assistant object, but you can override most of these when creating the Run for added flexibility:

```javascript
const run = await openai.beta.threads.runs.create(
thread.id,
{
  assistant_id: assistant.id,
  model: "gpt-4o",
  instructions: "New instructions that override the Assistant instructions",
  tools: [{"type": "code_interpreter"}, {"type": "file_search"}]
}
);
```

```bash
curl https://api.openai.com/v1/threads/THREAD_ID/runs \
-H "Authorization: Bearer $OPENAI_API_KEY" \
-H "Content-Type: application/json" \
-H "OpenAI-Beta: assistants=v2" \
-d '{
  "assistant_id": "ASSISTANT_ID",
  "model": "gpt-4o",
  "instructions": "New instructions that override the Assistant instructions",
  "tools": [{"type": "code_interpreter"}, {"type": "file_search"}]
}'
```

Note: `tool_resources` associated with the Assistant cannot be overridden during Run creation. You must use the [modify Assistant](/docs/api-reference/assistants/modifyAssistant) endpoint to do this.

#### Run lifecycle

Run objects can have multiple statuses.

![Run lifecycle - diagram showing possible status transitions](https://cdn.openai.com/API/docs/images/diagram-run-statuses-v2.png)

|Status|Definition|
|---|---|
|queued|When Runs are first created or when you complete the required_action, they are moved to a queued status. They should almost immediately move to in_progress.|
|in_progress|While in_progress, the Assistant uses the model and tools to perform steps. You can view progress being made by the Run by examining the Run Steps.|
|completed|The Run successfully completed! You can now view all Messages the Assistant added to the Thread, and all the steps the Run took. You can also continue the conversation by adding more user Messages to the Thread and creating another Run.|
|requires_action|When using the Function calling tool, the Run will move to a required_action state once the model determines the names and arguments of the functions to be called. You must then run those functions and submit the outputs before the run proceeds. If the outputs are not provided before the expires_at timestamp passes (roughly 10 mins past creation), the run will move to an expired status.|
|expired|This happens when the function calling outputs were not submitted before expires_at and the run expires. Additionally, if the runs take too long to execute and go beyond the time stated in expires_at, our systems will expire the run.|
|cancelling|You can attempt to cancel an in_progress run using the Cancel Run endpoint. Once the attempt to cancel succeeds, status of the Run moves to cancelled. Cancellation is attempted but not guaranteed.|
|cancelled|Run was successfully cancelled.|
|failed|You can view the reason for the failure by looking at the last_error object in the Run. The timestamp for the failure will be recorded under failed_at.|
|incomplete|Run ended due to max_prompt_tokens or max_completion_tokens reached. You can view the specific reason by looking at the incomplete_details object in the Run.|

#### Polling for updates

If you are not using [streaming](/docs/assistants/overview#step-4-create-a-run?context=with-streaming), in order to keep the status of your run up to date, you will have to periodically [retrieve the Run](/docs/api-reference/runs/getRun) object. You can check the status of the run each time you retrieve the object to determine what your application should do next.

You can optionally use Polling Helpers in our [Node](https://github.com/openai/openai-node?tab=readme-ov-file#polling-helpers) and [Python](https://github.com/openai/openai-python?tab=readme-ov-file#polling-helpers) SDKs to help you with this. These helpers will automatically poll the Run object for you and return the Run object when it's in a terminal state.

#### Thread locks

When a Run is `in_progress` and not in a terminal state, the Thread is locked. This means that:

*   New Messages cannot be added to the Thread.
*   New Runs cannot be created on the Thread.

#### Run steps

![Run steps lifecycle - diagram showing possible status transitions](https://cdn.openai.com/API/docs/images/diagram-2.png)

Run step statuses have the same meaning as Run statuses.

Most of the interesting detail in the Run Step object lives in the `step_details` field. There can be two types of step details:

1.  `message_creation`: This Run Step is created when the Assistant creates a Message on the Thread.
2.  `tool_calls`: This Run Step is created when the Assistant calls a tool. Details around this are covered in the relevant sections of the [Tools](/docs/assistants/tools) guide.

Data Access Guidance
--------------------

Currently, Assistants, Threads, Messages, and Vector Stores created via the API are scoped to the Project they're created in. As such, any person with API key access to that Project is able to read or write Assistants, Threads, Messages, and Runs in the Project.

We strongly recommend the following data access controls:

*   _Implement authorization._ Before performing reads or writes on Assistants, Threads, Messages, and Vector Stores, ensure that the end-user is authorized to do so. For example, store in your database the object IDs that the end-user has access to, and check it before fetching the object ID with the API.
*   _Restrict API key access._ Carefully consider who in your organization should have API keys and be part of a Project. Periodically audit this list. API keys enable a wide range of operations including reading and modifying sensitive information, such as Messages and Files.
*   _Create separate accounts._ Consider creating separate Projects for different applications in order to isolate data across multiple applications.

Was this page useful?

Assistants File Search

Beta

==============================

File Search augments the Assistant with knowledge from outside its model, such as proprietary product information or documents provided by your users. OpenAI automatically parses and chunks your documents, creates and stores the embeddings, and use both vector and keyword search to retrieve relevant content to answer user queries.

Quickstart
----------

In this example, we’ll create an assistant that can help answer questions about companies’ financial statements.

### Step 1: Create a new Assistant with File Search Enabled

Create a new assistant with `file_search` enabled in the `tools` parameter of the Assistant.

```javascript
import OpenAI from "openai";
const openai = new OpenAI();

async function main() {
const assistant = await openai.beta.assistants.create({
  name: "Workers Comp Assistant",
  instructions: "You are an expert workers comp analyst. Use you knowledge base to answer questions about workers comp claims.",
  model: "gpt-4o",
  tools: [{ type: "file_search" }],
});
}
Once the `file_search` tool is enabled, the model decides when to retrieve content based on user messages.

### Step 2: Upload files and add them to a Vector Store

To access your files, the `file_search` tool uses the Vector Store object. Upload your files and create a Vector Store to contain them. Once the Vector Store is created, you should poll its status until all files are out of the `in_progress` state to ensure that all content has finished processing. The SDK provides helpers to uploading and polling in one shot.



# Use the upload and poll SDK helper to upload the files, add them to the vector store,
# and poll the status of the file batch for completion.
file_batch = client.beta.vector_stores.file_batches.upload_and_poll(
vector_store_id=vector_store.id, files=file_streams
)

```javascript
const fileStreams = ["Users uploaded pdf file ", "another user uploaded pdf file"].map((path) =>
fs.createReadStream(path),
);

// Create a vector store including our two files.
let vectorStore = await openai.beta.vectorStores.create({
name: "workers comp Vector store"
});

await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStore.id, fileStreams)
```

### Step 3: Update the assistant to use the new Vector Store

To make the files accessible to your assistant, update the assistant’s `tool_resources` with the new `vector_store` id.

await openai.beta.assistants.update(assistant.id, {
tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
});


### Step 4: Create a thread

You can also attach files as Message attachments on your thread. Doing so will create another `vector_store` associated with the thread, or, if there is already a vector store attached to this thread, attach the new files to the existing thread vector store. When you create a Run on this thread, the file search tool will query both the `vector_store` from your assistant and the `vector_store` on the thread.

In this example, the user attached a copy of medical report that needs summarized.

# The thread now has a vector store with that file in its tool resources.
print(thread.tool_resources.file_search)
```


// A user wants to attach a file to a specific message, let's upload it.
const medicalReport = await openai.files.create({
file: fs.createReadStream("/medical_report.pdf"),
purpose: "assistants",
});

const thread = await openai.beta.threads.create({
messages: [
  {
    role: "user",
    content:
      "what is the pd rating of uploaded medical report?",
    // Attach the new file to the message.
    attachments: [{ file_id: medicalReport.id, tools: [{ type: "file_search" }] }],
  },
],
});

// The thread now has a vector store in its tool resources.
console.log(thread.tool_resources?.file_search);
```

Vector stores created using message attachments have a default expiration policy of 7 days after they were last active (defined as the last time the vector store was part of a run). This default exists to help you manage your vector storage costs. You can override these expiration policies at any time. Learn more [here](#managing-costs-with-expiration-policies).

### Step 5: Create a run and check the output

Now, create a Run and observe that the model uses the File Search tool to provide a response to the user’s question.

With streamingWithout streaming

const stream = openai.beta.threads.runs
.stream(thread.id, {
  assistant_id: assistant.id,
})
.on("textCreated", () => console.log("assistant >"))
.on("toolCallCreated", (event) => console.log("assistant " + event.type))
.on("messageDone", async (event) => {
  if (event.content[0].type === "text") {
    const { text } = event.content[0];
    const { annotations } = text;
    const citations: string[] = [];

    let index = 0;
    for (let annotation of annotations) {
      text.value = text.value.replace(annotation.text, "[" + index + "]");
      const { file_citation } = annotation;
      if (file_citation) {
        const citedFile = await openai.files.retrieve(file_citation.file_id);
        citations.push("[" + index + "]" + citedFile.filename);
      }
      index++;
    }

    console.log(text.value);
    console.log(citations.join("\n"));
  }
```

Your new assistant will query both attached vector stores (one containing `goog-10k.pdf` and `brka-10k.txt`, and the other containing `aapl-10k.pdf`) and return this result from `aapl-10k.pdf`.

To retrieve the contents of the file search results that were used by the model, use the `include` query parameter and provide a value of `step_details.tool_calls[*].file_search.results[*].content` in the format `?include[]=step_details.tool_calls[*].file_search.results[*].content`.

* * *

How it works
------------

The `file_search` tool implements several retrieval best practices out of the box to help you extract the right data from your files and augment the model’s responses. The `file_search` tool:

*   Rewrites user queries to optimize them for search.
*   Breaks down complex user queries into multiple searches it can run in parallel.
*   Runs both keyword and semantic searches across both assistant and thread vector stores.
*   Reranks search results to pick the most relevant ones before generating the final response.

By default, the `file_search` tool uses the following settings but these can be [configured](#customizing-file-search-settings) to suit your needs:

*   Chunk size: 800 tokens
*   Chunk overlap: 400 tokens
*   Embedding model: `text-embedding-3-large` at 256 dimensions
*   Maximum number of chunks added to context: 20 (could be fewer)
*   Ranker: `auto` (OpenAI will choose which ranker to use)
*   Score threshold: 0 minimum ranking score

**Known Limitations**

We have a few known limitations we're working on adding support for in the coming months:

1.  Support for deterministic pre-search filtering using custom metadata.
2.  Support for parsing images within documents (including images of charts, graphs, tables etc.)
3.  Support for retrievals over structured file formats (like `csv` or `jsonl`).
4.  Better support for summarization — the tool today is optimized for search queries.

Vector stores
-------------

Vector Store objects give the File Search tool the ability to search your files. Adding a file to a `vector_store` automatically parses, chunks, embeds and stores the file in a vector database that's capable of both keyword and semantic search. Each `vector_store` can hold up to 10,000 files. Vector stores can be attached to both Assistants and Threads. Today, you can attach at most one vector store to an assistant and at most one vector store to a thread.

#### Creating vector stores and adding files

You can create a vector store and add files to it in a single API call:

const vectorStore = await openai.beta.vectorStores.create({
name: "Product Documentation",
file_ids: ['file_1', 'file_2', 'file_3', 'file_4', 'file_5']
});


Adding files to vector stores is an async operation. To ensure the operation is complete, we recommend that you use the 'create and poll' helpers in our official SDKs. If you're not using the SDKs, you can retrieve the `vector_store` object and monitor it's [`file_counts`](/docs/api-reference/vector-stores/object#vector-stores/object-file_counts) property to see the result of the file ingestion operation.

Files can also be added to a vector store after it's created by [creating vector store files](/docs/api-reference/vector-stores/createFile).


const file = await openai.beta.vectorStores.files.createAndPoll(
"vs_abc123",
{ file_id: "file-abc123" }
);

Alternatively, you can add several files to a vector store by [creating batches](/docs/api-reference/vector-stores/createBatch) of up to 500 files


const batch = await openai.beta.vectorStores.fileBatches.createAndPoll(
"vs_abc123",
{ file_ids: ["file_1", "file_2", "file_3", "file_4", "file_5"] },


Similarly, these files can be removed from a vector store by either:

*   Deleting the [vector store file object](/docs/api-reference/vector-stores/deleteFile) or,
*   By deleting the underlying [file object](/docs/api-reference/files/delete) (which removes the file it from all `vector_store` and `code_interpreter` configurations across all assistants and threads in your organization)

The maximum file size is 512 MB. Each file should contain no more than 5,000,000 tokens per file (computed automatically when you attach a file).

File Search supports a variety of file formats including `.pdf`, `.md`, and `.docx`. More details on the file extensions (and their corresponding MIME-types) supported can be found in the [Supported files](#supported-files) section below.

#### Attaching vector stores

You can attach vector stores to your Assistant or Thread using the `tool_resources` parameter.


const assistant = await openai.beta.assistants.create({
instructions: "You are a helpful product support assistant and you answer questions based on the files provided to you.",
model: "gpt-4o",
tools: [{"type": "file_search"}],
tool_resources: {
  "file_search": {
    "vector_store_ids": ["vs_1"]
  }
}
});

const thread = await openai.beta.threads.create({
messages: [ { role: "user", content: "How do I cancel my subscription?"} ],
tool_resources: {
  "file_search": {
    "vector_store_ids": ["vs_2"]
  }
}
});


You can also attach a vector store to Threads or Assistants after they're created by updating them with the right `tool_resources`.

#### Ensuring vector store readiness before creating runs

We highly recommend that you ensure all files in a `vector_store` are fully processed before you create a run. This will ensure that all the data in your `vector_store` is searchable. You can check for `vector_store` readiness by using the polling helpers in our SDKs, or by manually polling the `vector_store` object to ensure the [`status`](/docs/api-reference/vector-stores/object#vector-stores/object-status) is `completed`.

As a fallback, we've built a **60 second maximum wait** in the Run object when the **thread’s** vector store contains files that are still being processed. This is to ensure that any files your users upload in a thread a fully searchable before the run proceeds. This fallback wait _does not_ apply to the assistant's vector store.

#### Customizing File Search settings

You can customize how the `file_search` tool chunks your data and how many chunks it returns to the model context.

**Chunking configuration**

By default, `max_chunk_size_tokens` is set to `800` and `chunk_overlap_tokens` is set to `400`, meaning every file is indexed by being split up into 800-token chunks, with 400-token overlap between consecutive chunks.

You can adjust this by setting [`chunking_strategy`](/docs/api-reference/vector-stores-files/createFile#vector-stores-files-createfile-chunking_strategy) when adding files to the vector store. There are certain limitations to `chunking_strategy`:

*   `max_chunk_size_tokens` must be between 100 and 4096 inclusive.
*   `chunk_overlap_tokens` must be non-negative and should not exceed `max_chunk_size_tokens / 2`.

**Number of chunks**

By default, the `file_search` tool outputs up to 20 chunks for `gpt-4*` models and up to 5 chunks for `gpt-3.5-turbo`. You can adjust this by setting [`file_search.max_num_results`](/docs/api-reference/assistants/createAssistant#assistants-createassistant-tools) in the tool when creating the assistant or the run.

Note that the `file_search` tool may output fewer than this number for a myriad of reasons:

*   The total number of chunks is fewer than `max_num_results`.
*   The total token size of all the retrieved chunks exceeds the token "budget" assigned to the `file_search` tool. The `file_search` tool currently has a token bugdet of:
    *   4,000 tokens for `gpt-3.5-turbo`
    *   16,000 tokens for `gpt-4*` models

#### Improve file search result relevance with chunk ranking

By default, the file search tool will return all search results to the model that it thinks have any level of relevance when generating a response. However, if responses are generated using content that has low relevance, it can lead to lower quality responses. You can adjust this behavior by both inspecting the file search results that are returned when generating responses, and then tuning the behavior of the file search tool's ranker to change how relevant results must be before they are used to generate a response.

**Inspecting file search chunks**

The first step in improving the quality of your file search results is inspecting the current behavior of your assistant. Most often, this will involve investigating responses from your assistant that are not not performing well. You can get [granular information about a past run step](/docs/api-reference/run-steps/getRunStep) using the REST API, specifically using the `include` query parameter to get the file chunks that are being used to generate results.

Include file search results in response when creating a run

import OpenAI from "openai";
const openai = new OpenAI();

const runStep = await openai.beta.threads.runs.steps.retrieve(
"thread_abc123",
"run_abc123",
"step_abc123",
{
  include: ["step_details.tool_calls[*].file_search.results[*].content"]
}
);

console.log(runStep);


You can then log and inspect the search results used during the run step, and determine whether or not they are consistently relevant to the responses your assistant should generate.

**Configure ranking options**

If you have determined that your file search results are not sufficiently relevant to generate high quality responses, you can adjust the settings of the result ranker used to choose which search results should be used to generate responses. You can adjust this setting [`file_search.ranking_options`](/docs/api-reference/assistants/createAssistant#assistants-createassistant-tools) in the tool when **creating the assistant** or **creating the run**.

The settings you can configure are:

*   `ranker` - Which ranker to use in determining which chunks to use. The available values are `auto`, which uses the latest available ranker, and `default_2024_08_21`.
*   `score_threshold` - a ranking between 0.0 and 1.0, with 1.0 being the highest ranking. A higher number will constrain the file chunks used to generate a result to only chunks with a higher possible relevance, at the cost of potentially leaving out relevant chunks.

#### Managing costs with expiration policies

The `file_search` tool uses the `vector_stores` object as its resource and you will be billed based on the [size](/docs/api-reference/vector-stores/object#vector-stores/object-bytes) of the `vector_store` objects created. The size of the vector store object is the sum of all the parsed chunks from your files and their corresponding embeddings.

You first GB is free and beyond that, usage is billed at $0.10/GB/day of vector storage. There are no other costs associated with vector store operations.

In order to help you manage the costs associated with these `vector_store` objects, we have added support for expiration policies in the `vector_store` object. You can set these policies when creating or updating the `vector_store` object.


let vectorStore = await openai.beta.vectorStores.create({
name: "rag-store",
file_ids: ['file_1', 'file_2', 'file_3', 'file_4', 'file_5'],
expires_after: {
  anchor: "last_active_at",
  days: 7
}
});

**Thread vector stores have default expiration policies**

Vector stores created using thread helpers (like [`tool_resources.file_search.vector_stores`](/docs/api-reference/threads/createThread#threads-createthread-tool_resources) in Threads or [message.attachments](/docs/api-reference/messages/createMessage#messages-createmessage-attachments) in Messages) have a default expiration policy of 7 days after they were last active (defined as the last time the vector store was part of a run).

When a vector store expires, runs on that thread will fail. To fix this, you can simply recreate a new `vector_store` with the same files and reattach it to the thread.


const fileIds = [];
for await (const file of openai.beta.vectorStores.files.list(
"vs_toWTk90YblRLCkbE2xSVoJlF",
)) {
fileIds.push(file.id);
}

const vectorStore = await openai.beta.vectorStores.create({
name: "rag-store",
});
await openai.beta.threads.update("thread_abcd", {
tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
});

for (const fileBatch of _.chunk(fileIds, 100)) {
await openai.beta.vectorStores.fileBatches.create(vectorStore.id, {
  file_ids: fileBatch,
});
}

Assistants Code Interpreter

Beta

===================================

Code Interpreter allows Assistants to write and run Python code in a sandboxed execution environment. This tool can process files with diverse data and formatting, and generate files with data and images of graphs. Code Interpreter allows your Assistant to run code iteratively to solve challenging code and math problems. When your Assistant writes code that fails to run, it can iterate on this code by attempting to run different code until the code execution succeeds.

See a quickstart of how to get started with Code Interpreter [here](/docs/assistants/overview#step-1-create-an-assistant?context=with-streaming).

How it works
------------

Code Interpreter is charged at $0.03 per session. If your Assistant calls Code Interpreter simultaneously in two different threads (e.g., one thread per end-user), two Code Interpreter sessions are created. Each session is active by default for one hour, which means that you only pay for one session per if users interact with Code Interpreter in the same thread for up to one hour.

### Enabling Code Interpreter

Pass `code_interpreter` in the `tools` parameter of the Assistant object to enable Code Interpreter:

```javascript
const assistant = await openai.beta.assistants.create({
instructions: "You are a personal math tutor. When asked a math question, write and run code to answer the question.",
model: "gpt-4o",
tools: [{"type": "code_interpreter"}]
});
```

The model then decides when to invoke Code Interpreter in a Run based on the nature of the user request. This behavior can be promoted by prompting in the Assistant's `instructions` (e.g., “write code to solve this problem”).

### Passing files to Code Interpreter

Files that are passed at the Assistant level are accessible by all Runs with this Assistant:

# Create an assistant using the file ID
assistant = client.beta.assistants.create(
instructions="You are a personal math tutor. When asked a math question, write and run code to answer the question.",
model="gpt-4o",
tools=[{"type": "code_interpreter"}],
tool_resources={
  "code_interpreter": {
    "file_ids": [file.id]
  }
}
)


// Upload a file with an "assistants" purpose
const file = await openai.files.create({
file: fs.createReadStream("mydata.csv"),
purpose: "assistants",
});

// Create an assistant using the file ID
const assistant = await openai.beta.assistants.create({
instructions: "You are a personal math tutor. When asked a math question, write and run code to answer the question.",
model: "gpt-4o",
tools: [{"type": "code_interpreter"}],
tool_resources: {
  "code_interpreter": {
    "file_ids": [file.id]
  }
}
});


Files can also be passed at the Thread level. These files are only accessible in the specific Thread. Upload the File using the [File upload](/docs/api-reference/files/create) endpoint and then pass the File ID as part of the Message creation request:



const thread = await openai.beta.threads.create({
messages: [
  {
    "role": "user",
    "content": "I need to solve the equation `3x + 11 = 14`. Can you help me?",
    "attachments": [
      {
        file_id: file.id,
        tools: [{type: "code_interpreter"}]
      }
    ]
  }
]
});


Files have a maximum size of 512 MB. Code Interpreter supports a variety of file formats including `.csv`, `.pdf`, `.json` and many more. More details on the file extensions (and their corresponding MIME-types) supported can be found in the [Supported files](#supported-files) section below.

### Reading images and files generated by Code Interpreter

Code Interpreter in the API also outputs files, such as generating image diagrams, CSVs, and PDFs. There are two types of files that are generated:

1.  Images
2.  Data files (e.g. a `csv` file with data generated by the Assistant)

When Code Interpreter generates an image, you can look up and download this file in the `file_id` field of the Assistant Message response:

```json
{
	"id": "msg_abc123",
	"object": "thread.message",
	"created_at": 1698964262,
	"thread_id": "thread_abc123",
	"role": "assistant",
	"content": [
    {
      "type": "image_file",
      "image_file": {
        "file_id": "file-abc123"
      }
    }
  ]
  # ...
}
```

The file content can then be downloaded by passing the file ID to the Files API:


```javascript
import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI();

async function main() {
const response = await openai.files.content("file-abc123");

// Extract the binary data from the Response object
const image_data = await response.arrayBuffer();

// Convert the binary data to a Buffer
const image_data_buffer = Buffer.from(image_data);

// Save the image to a specific location
fs.writeFileSync("./my-image.png", image_data_buffer);
}





When Code Interpreter references a file path (e.g., ”Download this csv file”), file paths are listed as annotations. You can convert these annotations into links to download the file:

```json
{
  "id": "msg_abc123",
  "object": "thread.message",
  "created_at": 1699073585,
  "thread_id": "thread_abc123",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": {
        "value": "The rows of the CSV file have been shuffled and saved to a new CSV file. You can download the shuffled CSV file from the following link:\n\n[Download Shuffled CSV File](sandbox:/mnt/data/shuffled_file.csv)",
        "annotations": [
          {
            "type": "file_path",
            "text": "sandbox:/mnt/data/shuffled_file.csv",
            "start_index": 167,
            "end_index": 202,
            "file_path": {
              "file_id": "file-abc123"
            }
          }
          ...
```

### Input and output logs of Code Interpreter

By listing the steps of a Run that called Code Interpreter, you can inspect the code `input` and `outputs` logs of Code Interpreter:


```javascript
const runSteps = await openai.beta.threads.runs.steps.list(
thread.id,
run.id
);
```

