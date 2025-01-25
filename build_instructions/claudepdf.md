Build with Claude
PDF support

Process PDFs with Claude 3.5 Sonnet. Extract text, analyze charts, and understand visual content from your documents.

You can now ask Claude about any text, pictures, charts, and tables in PDFs you provide. Some sample use cases:

    Analyzing financial reports and understanding charts/tables
    Extracting key information from legal documents
    Translation assistance for documents
    Converting document information into structured formats

​
Before you begin
​
Check PDF requirements

Claude works with any standard PDF. However, you should ensure your request size meet these requirements when using PDF support:
Requirement	Limit
Maximum request size	32MB
Maximum pages per request	100
Format	Standard PDF (no passwords/encryption)

Please note that both limits are on the entire request payload, including any other content sent alongside PDFs.

Since PDF support relies on Claude’s vision capabilities, it is subject to the same limitations and considerations as other vision tasks.
​
Supported platforms and models

PDF support is currently available on both Claude 3.5 Sonnet models (claude-3-5-sonnet-20241022, claude-3-5-sonnet-20240620) via direct API access. This functionality will be supported on Amazon Bedrock and Google Vertex AI soon
​
Process PDFs with Claude
​
Send your first PDF request

Let’s start with a simple example using the Messages API:

# First fetch the file
curl -s "https://assets.anthropic.com/m/1cd9d098ac3e6467/original/Claude-3-Model-Card-October-Addendum.pdf" | base64 | tr -d '\n' > pdf_base64.txt

# Create a JSON request file using the pdf_base64.txt content
jq -n --rawfile PDF_BASE64 pdf_base64.txt '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [{
        "role": "user",
        "content": [{
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": $PDF_BASE64
            }
        },
        {
            "type": "text",
            "text": "Which model has the highest human preference win rates across each use-case?"
        }]
    }]
}' > request.json

# Finally send the API request using the JSON file
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d @request.json

​
How PDF support works

When you send a PDF to Claude, the following steps occur:
1

The system extracts the contents of the document.

    The system converts each page of the document into an image.
    The text from each page is extracted and provided alongside each page’s image.

2

Claude analyzes both the text and images to better understand the document.

    Documents are provided as a combination of text and images for analysis.
    This allows users to ask for insights on visual elements of a PDF, such as charts, diagrams, and other non-textual content.

3

Claude responds, referencing the PDF's contents if relevant.

Claude can reference both textual and visual content when it responds. You can further improve performance by integrating PDF support with:

    Prompt caching: To improve performance for repeated analysis.
    Batch processing: For high-volume document processing.
    Tool use: To extract specific information from documents for use as tool inputs.

​
Estimate your costs

The token count of a PDF file depends on the total text extracted from the document as well as the number of pages:

    Text token costs: Each page typically uses 1,500-3,000 tokens per page depending on content density. Standard API pricing applies with no additional PDF fees.
    Image token costs: Since each page is converted into an image, the same image-based cost calculations are applied.

You can use token counting to estimate costs for your specific PDFs.
​
Optimize PDF processing
​
Improve performance

Follow these best practices for optimal results:

    Place PDFs before text in your requests
    Use standard fonts
    Ensure text is clear and legible
    Rotate pages to proper upright orientation
    Use logical page numbers (from PDF viewer) in prompts
    Split large PDFs into chunks when needed
    Enable prompt caching for repeated analysis

​
Scale your implementation

For high-volume processing, consider these approaches:
​
Use prompt caching

Cache PDFs to improve performance on repeated queries:

# Create a JSON request file using the pdf_base64.txt content
jq -n --rawfile PDF_BASE64 pdf_base64.txt '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [{
        "role": "user",
        "content": [{
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": $PDF_BASE64
            },
            "cache_control": {
              "type": "ephemeral"
            }
        },
        {
            "type": "text",
            "text": "Which model has the highest human preference win rates across each use-case?"
        }]
    }]
}' > request.json

# Then make the API call using the JSON file
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d @request.json

​
Process document batches

Use the Message Batches API for high-volume workflows:

# Create a JSON request file using the pdf_base64.txt content
jq -n --rawfile PDF_BASE64 pdf_base64.txt '
{
  "requests": [
      {
          "custom_id": "my-first-request",
          "params": {
              "model": "claude-3-5-sonnet-20241022",
              "max_tokens": 1024,
              "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": $PDF_BASE64
                            }
                        },
                        {
                            "type": "text",
                            "text": "Which model has the highest human preference win rates across each use-case?"
                        }
                    ]
                }
              ]
          }
      },
      {
          "custom_id": "my-second-request",
          "params": {
              "model": "claude-3-5-sonnet-20241022",
              "max_tokens": 1024,
              "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": $PDF_BASE64
                            }
                        },
                        {
                            "type": "text",
                            "text": "Extract 5 key insights from this document."
                        }
                    ]
                }
              ]
          }
      }
  ]
}
' > request.json

# Then make the API call using the JSON file
curl https://api.anthropic.com/v1/messages/batches \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d @request.json
