document.addEventListener("DOMContentLoaded", async () => {
    // Get elements based on the correct HTML IDs
    const discussionTitle = document.getElementById("discussionTitle");
    const discussionContent = document.getElementById("discussionContent");
    const discussionUser = document.getElementById("discussionUser"); // Corrected from "discussionAuthor"
    const repliesContainer = document.getElementById("repliesContainer"); // Corrected from "responsesContainer"
    const replyForm = document.getElementById("replyForm"); // Corrected from "responseForm"
    const replyContent = document.getElementById("replyContent");

    if (!discussionTitle || !discussionContent || !discussionUser || !repliesContainer || !replyForm || !replyContent) {
        console.error("❌ Required elements not found in the DOM.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get("id");

    if (!postId) {
        alert("Invalid discussion.");
        window.location.href = "discussions.html";
        return;
    }

    // Fetch the discussion
    async function fetchDiscussion() {
        try {
            const response = await fetch(`http://localhost:5000/api/posts/${postId}`, { credentials: "include" });
            const discussion = await response.json();

            discussionTitle.innerText = discussion.title || "Untitled";
            discussionContent.innerText = discussion.content || "No content available.";
            discussionUser.innerText = `Posted by ${discussion.user?.username || "Unknown"} on ${new Date(discussion.createdAt).toLocaleString()}`;

            // Load replies
            repliesContainer.innerHTML = "";
            if (!discussion.responses || discussion.responses.length === 0) {
                repliesContainer.innerHTML = "<p>No replies yet.</p>";
            } else {
                discussion.responses.forEach(response => {
                    const responseElement = document.createElement("div");
                    responseElement.classList.add("response");
                    responseElement.innerHTML = `
                        <p>${response.content}</p>
                        <small>By ${response.user?.username || "Unknown"} on ${new Date(response.createdAt).toLocaleString()}</small>
                    `;
                    repliesContainer.appendChild(responseElement);
                });
            }
        } catch (err) {
            console.error("❌ Error fetching discussion:", err);
            alert("Failed to load discussion.");
        }
    }

    fetchDiscussion();

    // Handle reply submission
    replyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const content = replyContent.value.trim();

        if (!content) {
            alert("Reply cannot be empty.");
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/posts/${postId}/response`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ content }),
            });

            if (response.ok) {
                replyForm.reset();
                fetchDiscussion(); // Refresh replies
            } else {
                const data = await response.json();
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error("❌ Error posting reply:", err);
            alert("Failed to post reply.");
        }
    });
});
