import { Link, useParams } from "react-router-dom";
import { getPost } from "../lib/posts";

function Post() {
  const { id } = useParams();
  const post = getPost(id);

  if (!post) {
    return <p>Post not found. <Link to="/" className="underline">Back home</Link></p>;
  }

  // TODO: render post.content as markdown
  return (
    <article className="w-full">
      <h1 className="text-2xl font-medium">{post.title}</h1>
      <p className="text-sm text-muted-foreground">{post.date}</p>
      <pre className="whitespace-pre-wrap">{post.content}</pre>
    </article>
  )
}

export default Post
