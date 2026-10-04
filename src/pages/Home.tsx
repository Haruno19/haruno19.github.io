import { Fragment } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { posts } from "../lib/posts";

function Home() {
  return (
    <>
      {posts.map((post) =>
        <Fragment key={post.id}>
          <Link to={`/post/${post.id}`} className="w-full">
            <Card className="cursor-pointer ring-1 w-full h-35 hover:shadow-[1px_2px_0_0_var(--color-border)] transition ease-in-out duration-250 flex-row gap-0 py-0">
              <div className="flex flex-1 min-w-0 flex-col gap-(--card-spacing) py-(--card-spacing)">
                <CardHeader>
                  <CardTitle>{post.title}</CardTitle>
                  <CardDescription>{post.date}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-1">{post.content}</p>
                </CardContent>
              </div>
              <div className="h-full aspect-square shrink-0">
                {post.cover && <img src={post.cover} className="size-full object-cover" />}
              </div>
            </Card>
          </Link>
          <Separator className="bg-background py-1"/>
        </Fragment>
      )}
    </>
  )
}

export default Home
