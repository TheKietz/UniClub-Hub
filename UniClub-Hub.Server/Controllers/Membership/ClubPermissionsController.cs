using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UniClub_Hub.Membership.DTOs.Permission;
using UniClub_Hub.Membership.Services.Interfaces;
using UniClub_Hub.Shared.Common;

namespace UniClub_Hub.Server.Controllers.Membership
{
    [ApiController]
    [Route("api/club-permissions")]
    [Authorize]
    public class ClubPermissionsController : ControllerBase
    {
        private readonly IClubPermissionCatalogService _catalog;

        public ClubPermissionsController(IClubPermissionCatalogService catalog)
        {
            _catalog = catalog;
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            var permissions = _catalog.GetAll();
            return Ok(ApiResponse<IReadOnlyList<ClubPermissionDto>>.Ok(permissions));
        }
    }
}
