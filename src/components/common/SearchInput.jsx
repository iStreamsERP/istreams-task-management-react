import { Search } from "lucide-react";

const SearchInput = () => {
  return (
    <label className="input input-bordered flex items-center gap-2">
      <input type="text" className="grow" placeholder="Search" />
      <Search className="h-4 w-4 opacity-70" />
    </label>
  );
};

export default SearchInput;
