import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <div className="container py-5 text-center">
      <h1 className="display-6">Unauthorized</h1>
      <p>You do not have permission to access this page.</p>
      <Link className="btn btn-primary" to="/">
        Back to Home
      </Link>
    </div>
  );
}
