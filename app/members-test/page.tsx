import { getMembers } from '@/lib/google-sheets';

// Force dynamic rendering - requires env vars at runtime
export const dynamic = 'force-dynamic';

export default async function MembersTestPage() {
    const members = await getMembers();

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Members Test Page</h1>
            <p className="mb-4">Total Members: {members.length}</p>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-3 border">Name</th>
                            <th className="p-3 border">Email</th>
                            <th className="p-3 border">Role</th>
                            <th className="p-3 border">Company</th>
                            <th className="p-3 border">Expertise</th>
                            <th className="p-3 border">Status</th>
                            <th className="p-3 border">Phone</th>
                            <th className="p-3 border">Socials</th>
                            <th className="p-3 border">Company Website</th>
                            <th className="p-3 border">Country</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((member) => (
                            <tr key={member.id} className="hover:bg-gray-50">
                                <td className="p-3 border">{member.name}</td>
                                <td className="p-3 border">{member.email}</td>
                                <td className="p-3 border">{member.role}</td>
                                <td className="p-3 border">{member.company}</td>
                                <td className="p-3 border">{member.expertise}</td>
                                <td className="p-3 border">{member.status}</td>
                                <td className="p-3 border">{member.phone}</td>
                                <td className="p-3 border">
                                    <div className="flex flex-col gap-1 text-sm">
                                        {member.facebook_url && <a href={member.facebook_url} target="_blank" className="text-blue-600 hover:underline">Facebook</a>}
                                        {member.linkedin_url && <a href={member.linkedin_url} target="_blank" className="text-blue-600 hover:underline">LinkedIn</a>}
                                    </div>
                                </td>
                                <td className="p-3 border">
                                    {member.company_website && (
                                        <a href={member.company_website} target="_blank" className="text-blue-600 hover:underline truncate block max-w-[200px]">
                                            {member.company_website}
                                        </a>
                                    )}
                                </td>
                                <td className="p-3 border">{member.country}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
